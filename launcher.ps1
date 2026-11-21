[CmdletBinding()]
param(
    [ValidateRange(0, 65535)]
    [int]$Port = 8137,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'

if (-not ('AfterformLocalServer' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

public static class AfterformLocalServer
{
    private const int HeaderLimit = 16384;
    private static readonly Dictionary<string, string> ContentTypes =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { ".html", "text/html; charset=utf-8" },
            { ".css", "text/css; charset=utf-8" },
            { ".js", "text/javascript; charset=utf-8" },
            { ".json", "application/json; charset=utf-8" },
            { ".md", "text/markdown; charset=utf-8" },
            { ".webp", "image/webp" },
            { ".avif", "image/avif" },
            { ".jpg", "image/jpeg" },
            { ".jpeg", "image/jpeg" },
            { ".png", "image/png" },
            { ".svg", "image/svg+xml" },
            { ".ico", "image/x-icon" },
            { ".woff2", "font/woff2" },
            { ".woff", "font/woff" },
            { ".ttf", "font/ttf" }
        };

    public static TcpListener Listen(int port)
    {
        var listener = new TcpListener(IPAddress.Loopback, port);
        listener.ExclusiveAddressUse = true;
        try
        {
            listener.Start();
            return listener;
        }
        catch (SocketException)
        {
            listener.Stop();
            if (port == 0) throw;
            return Listen(0);
        }
    }

    public static void Queue(TcpClient client, string root, int port)
    {
        ThreadPool.QueueUserWorkItem(delegate { Serve(client, root, port); });
    }

    private static void Serve(TcpClient client, string root, int port)
    {
        using (client)
        {
            try
            {
                client.ReceiveTimeout = 5000;
                client.SendTimeout = 5000;
                using (NetworkStream stream = client.GetStream())
                {
                    ServeRequest(stream, root, port);
                }
            }
            catch (IOException) { }
            catch (SocketException) { }
            catch (UnauthorizedAccessException) { }
        }
    }

    private static void ServeRequest(NetworkStream stream, string root, int port)
    {
        string headers = ReadHeaders(stream);
        if (headers == null) return;

        string[] lines = headers.Split(new[] { "\r\n" }, StringSplitOptions.None);
        string[] request = lines[0].Split(' ');
        if (request.Length != 3 || (request[2] != "HTTP/1.1" && request[2] != "HTTP/1.0"))
        {
            Error(stream, "400 Bad Request", false);
            return;
        }

        bool headOnly = request[0] == "HEAD";
        if (request[0] != "GET" && !headOnly)
        {
            Error(stream, "405 Method Not Allowed", false, "Allow: GET, HEAD\r\n");
            return;
        }

        if (!IsLocalHost(lines, port, request[2]))
        {
            Error(stream, "400 Bad Request", headOnly);
            return;
        }

        string path = ResolvePath(root, request[1]);
        string contentType;
        if (path == null || !ContentTypes.TryGetValue(Path.GetExtension(path), out contentType) || !File.Exists(path))
        {
            Error(stream, "404 Not Found", headOnly);
            return;
        }

        using (FileStream file = File.Open(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete))
        {
            WriteHeaders(stream, "200 OK", contentType, file.Length, "");
            if (!headOnly) file.CopyTo(stream);
        }
    }

    private static string ReadHeaders(NetworkStream stream)
    {
        var buffer = new byte[HeaderLimit];
        int length = 0;
        while (length < buffer.Length)
        {
            int read = stream.Read(buffer, length, buffer.Length - length);
            if (read == 0) return null;
            int start = Math.Max(0, length - 3);
            length += read;
            for (int i = start; i <= length - 4; i++)
            {
                if (buffer[i] == 13 && buffer[i + 1] == 10 && buffer[i + 2] == 13 && buffer[i + 3] == 10)
                    return Encoding.ASCII.GetString(buffer, 0, i);
            }
        }

        Error(stream, "431 Request Header Fields Too Large", false);
        return null;
    }

    private static bool IsLocalHost(string[] lines, int port, string protocol)
    {
        string host = null;
        for (int i = 1; i < lines.Length; i++)
        {
            if (!lines[i].StartsWith("Host:", StringComparison.OrdinalIgnoreCase)) continue;
            if (host != null) return false;
            host = lines[i].Substring(5).Trim();
        }

        if (host == null) return protocol == "HTTP/1.0";
        string suffix = ":" + port.ToString(CultureInfo.InvariantCulture);
        return host == "127.0.0.1" + suffix ||
               String.Equals(host, "localhost" + suffix, StringComparison.OrdinalIgnoreCase) ||
               (port == 80 && (host == "127.0.0.1" || String.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase)));
    }

    private static string ResolvePath(string root, string target)
    {
        if (!target.StartsWith("/", StringComparison.Ordinal)) return null;

        int query = target.IndexOf('?');
        string path = Uri.UnescapeDataString(query < 0 ? target : target.Substring(0, query));
        if (path == "/") path = "/index.html";

        string resolved = root;
        foreach (string segment in path.Substring(1).Split('/'))
        {
            if (segment.Length == 0 || segment.Length > 255 ||
                segment.EndsWith(".") || segment.EndsWith(" ") ||
                segment.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0) return null;

            resolved = Path.Combine(resolved, segment);
            try
            {
                if ((File.GetAttributes(resolved) & FileAttributes.ReparsePoint) != 0) return null;
            }
            catch (IOException) { return null; }
            catch (UnauthorizedAccessException) { return null; }
        }

        string rootPrefix = root.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        if (!Path.GetFullPath(resolved).StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase)) return null;
        return resolved;
    }

    private static void Error(NetworkStream stream, string status, bool headOnly, string extra = "")
    {
        byte[] body = Encoding.UTF8.GetBytes(status + "\n");
        WriteHeaders(stream, status, "text/plain; charset=utf-8", body.Length, extra);
        if (!headOnly) stream.Write(body, 0, body.Length);
    }

    private static void WriteHeaders(NetworkStream stream, string status, string contentType, long size, string extra)
    {
        string response = "HTTP/1.1 " + status + "\r\n" +
            "Content-Type: " + contentType + "\r\n" +
            "Content-Length: " + size.ToString(CultureInfo.InvariantCulture) + "\r\n" +
            "Connection: close\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\n" + extra + "\r\n";
        byte[] bytes = Encoding.ASCII.GetBytes(response);
        stream.Write(bytes, 0, bytes.Length);
    }
}
'@
}

$root = (Resolve-Path -LiteralPath $PSScriptRoot).ProviderPath
$listener = [AfterformLocalServer]::Listen($Port)
try {
    $activePort = $listener.LocalEndpoint.Port
    $url = "http://127.0.0.1:$activePort"
    if ($Port -ne 0 -and $activePort -ne $Port) {
        Write-Host "Port $Port is unavailable. Using port $activePort."
    }

    Write-Host "Storefront  $url/"
    Write-Host "Admin       $url/admin.html"
    Write-Host 'Press Ctrl+C to stop serving AFTERFORM.'

    if (-not $NoBrowser) {
        try { Start-Process "$url/" }
        catch { Write-Warning "Open $url/ in your browser." }
    }

    while ($true) {
        if ($listener.Pending()) {
            [AfterformLocalServer]::Queue($listener.AcceptTcpClient(), $root, $activePort)
        } else {
            Start-Sleep -Milliseconds 50
        }
    }
} finally {
    $listener.Stop()
}
