/* Stable sample activity, relative to the day the demo first opens. */
window.AFSeed = function seedAdminActivity(catalog) {
  if (!catalog.length) return [];

  const people = [
    ["Riley Chen", "riley.chen@example.com", "18 Mercer Street, New York, NY 10013"],
    ["Jordan Ellis", "jordan.ellis@example.com", "1726 NE 11th Avenue, Portland, OR 97212"],
    ["Samara Cruz", "samara.cruz@example.com", "44 Moss Street, San Francisco, CA 94103"],
    ["Casey Moreno", "casey.moreno@example.com", "15 Cottage Street, Brooklyn, NY 11222"],
    ["Avery Reid", "avery.reid@example.com", "2804 French Place, Austin, TX 78722"],
    ["Noa Park", "noa.park@example.com", "736 N Milwaukee Avenue, Chicago, IL 60642"],
    ["Milan Brooks", "milan.brooks@example.com", "1214 E Pike Street, Seattle, WA 98122"],
    ["Taylor Quinn", "taylor.quinn@example.com", "1961 Echo Park Avenue, Los Angeles, CA 90026"],
    ["Kai Williams", "kai.williams@example.com", "402 Ann Street, Philadelphia, PA 19134"],
    ["Rowan Patel", "rowan.patel@example.com", "51 Winter Street, Boston, MA 02108"],
    ["Ari Hughes", "ari.hughes@example.com", "1500 16th Street, Denver, CO 80202"],
    ["Emerson Lee", "emerson.lee@example.com", "206 Cooper Road, Atlanta, GA 30303"],
    ["Quinn Ford", "quinn.ford@example.com", "2250 W 6th Street, Cleveland, OH 44113"],
    ["Jules Bennett", "jules.bennett@example.com", "614 H Street, Washington, DC 20002"],
    ["Hayden Cole", "hayden.cole@example.com", "946 Fulton Street, Sacramento, CA 95825"],
    ["Sage Morgan", "sage.morgan@example.com", "79 Acorn Way, Cambridge, MA 02138"]
  ];
  const today = new Date();
  const dailyVolume = [1, 2, 2, 4, 2, 5, 2, 3, 3, 3, 2, 5, 4, 2, 1];
  const orders = [];
  let randomState = 827144761;
  const next = max => {
    randomState = (Math.imul(1664525, randomState) + 1013904223) >>> 0;
    return Math.floor(randomState / 4294967296 * max);
  };
  const asPrice = number => Math.round(number * 100) / 100;
  const getItem = offset => {
    const biasedIndex = Math.floor(next(100) ** 1.4 / 100 ** 1.4 * catalog.length);
    const product = catalog[(biasedIndex + offset) % catalog.length];
    const size = product.sizes[next(product.sizes.length)] || "One size";
    const color = product.colors[next(product.colors.length)]?.name || "Default";
    return {id:product.id, name:product.name, size, color, qty:1 + Number(next(14) === 0), price:product.price, image:product.image};
  };

  for (let daysAgo = 59; daysAgo >= 0; daysAgo -= 1) {
    const volume = dailyVolume[daysAgo % dailyVolume.length] - Number(daysAgo > 29 && daysAgo % 3 === 1);
    for (let row = 0; row < volume; row += 1) {
      const serial = orders.length;
      const [customer, email, address] = people[next(people.length)];
      const placedAt = new Date(today);
      placedAt.setDate(today.getDate() - daysAgo);
      if (daysAgo) placedAt.setHours(10 + row, next(60), 0, 0);
      else placedAt.setMinutes(Math.max(0, today.getMinutes() - row - 1), 0, 0);
      const items = [getItem(0)];
      if (next(10) < 4 && catalog.length > 1) items.push(getItem(1));
      const subtotal = asPrice(items.reduce((sum, line) => sum + line.qty * line.price, 0));
      const discount = next(8) === 0 ? asPrice(subtotal * 0.1) : 0;
      const shipping = subtotal >= window.AF.config.shippingFree ? 0 : window.AF.config.shippingStandard;
      const cancelled = daysAgo > 5 && serial % 43 === 0;
      const fulfillment = cancelled || daysAgo < 2 ? "Unfulfilled" : daysAgo <= 3 ? "Packed" : daysAgo <= 5 ? "Shipped" : "Delivered";
      const payment = cancelled ? "Refunded" : daysAgo < 3 && serial % 3 === 2 ? "Pending" : "Paid";
      const status = cancelled ? "Cancelled" : fulfillment === "Delivered" ? "Completed" : "Open";
      orders.push({id:`AF-${1001 + serial}`, date:placedAt.toISOString(), customer, email, address, status, payment, fulfillment, items, subtotal, discount, shipping, total:asPrice(subtotal - discount + shipping)});
    }
  }
  return orders.reverse();
};
