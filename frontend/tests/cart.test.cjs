const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../js/cart.js"), "utf8");

function createCart(initial = "[]") {
  let stored = initial;
  let toastMarkup = "";
  let toastText = "";
  const context = {
    localStorage: {
      getItem: () => stored,
      setItem: (_, value) => { stored = value; },
      removeItem: () => { stored = null; },
    },
    document: {
      addEventListener() {},
      querySelectorAll: () => [],
      getElementById: () => null,
      createElement: () => ({
        set innerHTML(value) { toastMarkup = value; },
        querySelector() { return { set textContent(value) { toastText = value; } }; },
      }),
      body: { appendChild() {} },
    },
    window: { dispatchEvent() {} },
    CustomEvent: class {},
    requestAnimationFrame() {},
    setTimeout() {},
  };
  const cart = vm.runInNewContext(source + "\nCart;", context);
  return { cart, getStore: () => stored, getMarkup: () => toastMarkup, getText: () => toastText };
}

test("invalid JSON and non-array cart data are safely ignored", () => {
  assert.equal(createCart("invalid").cart.get().length, 0);
  assert.equal(createCart("{}").cart.get().length, 0);
});

test("corrupted, infinite or negative cart prices cannot change totals", () => {
  const bad = [
    { sku: "X", key: "X", name: "A", price: -99, quantidade: 1 },
    { sku: "X", key: "Y", name: "B", price: "45", quantidade: 1 },
    { sku: "X", key: "Z", name: "C", price: 3, quantidade: -2 },
    { sku: "X", key: "V", name: "D", price: 12, quantidade: 3 },
  ];
  const { cart } = createCart(JSON.stringify(bad));
  assert.equal(cart.get().length, 1);
  assert.equal(cart.getSubtotal(), 36);
  assert.equal(cart.getItemCount(), 3);
});

test("new additions reject bad quantities and prices", () => {
  const { cart } = createCart();
  cart.showToast = () => {};
  cart.add({ sku: "ABC", name: "Item", price: -1 }, 1);
  cart.add({ sku: "ABC", name: "Item", price: 12 }, -1);
  assert.equal(cart.get().length, 0);
  cart.add({ sku: "ABC", name: "Item", price: 12 }, 2);
  assert.equal(cart.getSubtotal(), 24);
});

test("toast user-controlled names are assigned as text, never parsed HTML", () => {
  const { cart, getText, getMarkup } = createCart();
  const payload = '<img src=x onerror=alert(1)>';
  cart.showToast(payload);
  assert.equal(getText(), payload);
  assert.doesNotMatch(getMarkup(), /onerror=/);
});

test("public checkout does not contain a placeholder payments API", () => {
  const checkout = fs.readFileSync(path.join(__dirname, "../checkout.html"), "utf8");
  assert.doesNotMatch(checkout, /SEU-APP\.railway\.app/);
  assert.match(checkout, /Checkout temporariamente indisponível/);
  assert.match(checkout, /AQV_PAYMENT_ALLOWED_HOSTS/);
});

test("oversized or extremely priced browser cart entries never inflate totals", () => {
  const huge = createCart(" ".repeat(128_001));
  assert.equal(huge.cart.getItemCount(), 0);
  const priceAttack = createCart(JSON.stringify([
    { sku: "SK", key: "SK", name: "Unexpected total", price: 1e308, quantidade: 100 },
  ]));
  assert.equal(priceAttack.cart.getSubtotal(), 0);
  const many = createCart(JSON.stringify(Array.from({ length: 201 }, (_, i) => ({
    sku: "SKU-" + i, key: "SKU-" + i, name: "Entry " + i,
    price: 10, quantidade: 1,
  }))));
  assert.equal(many.cart.getItemCount(), 0);
});

test("new item validation rejects missing labels and astronomical prices", () => {
  const { cart } = createCart();
  cart.add({ sku: "X", price: 10 }, 1);
  cart.add({ sku: "X", name: "Item", price: 1e308 }, 1);
  cart.add({ sku: "", name: "Item", price: 10 }, 1);
  assert.equal(cart.get().length, 0);
});
