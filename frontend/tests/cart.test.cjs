const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../js/cart.js"), "utf8");

function createCart(initial = "[]", failWrite = false, reduceMotion = false) {
  let stored = initial;
  let toastMarkup = "";
  let toastText = "";
  const toastAttributes = {};
  const toastStyle = {};
  const context = {
    localStorage: {
      getItem: () => stored,
      setItem: (_, value) => { if (failWrite) throw new Error("Browser storage disabled"); stored = value; },
      removeItem: () => { if (failWrite) throw new Error("Browser storage disabled"); stored = null; },
    },
    document: {
      addEventListener() {},
      querySelectorAll: () => [],
      getElementById: () => null,
      createElement: () => ({
        firstElementChild: { style: toastStyle },
        setAttribute(name, value) { toastAttributes[name] = value; },
        set innerHTML(value) { toastMarkup = value; },
        querySelector() { return { set textContent(value) { toastText = value; } }; },
      }),
      body: { appendChild() {} },
    },
    window: { dispatchEvent() {}, matchMedia: () => ({ matches: reduceMotion }) },
    CustomEvent: class {},
    requestAnimationFrame() {},
    setTimeout() {},
  };
  const cart = vm.runInNewContext(source + "\nCart;", context);
  return { cart, getStore: () => stored, getMarkup: () => toastMarkup, getText: () => toastText, getToastAttributes: () => toastAttributes, getToastStyle: () => toastStyle };
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

test("cart toast announces text to assistive technology", () => {
  const { cart, getToastAttributes, getText } = createCart();
  cart.showToast("Produto adicionado");
  assert.equal(getToastAttributes().role, "status");
  assert.equal(getToastAttributes()["aria-live"], "polite");
  assert.equal(getToastAttributes()["aria-atomic"], "true");
  assert.equal(getText(), "Produto adicionado");
});

test("reduced-motion preference shows notifications without animated movement", () => {
  const { cart, getToastStyle } = createCart("[]", false, true);
  cart.showToast("Pronto");
  assert.equal(getToastStyle().transition, "none");
  assert.equal(getToastStyle().transform, "none");
  assert.equal(getToastStyle().opacity, "1");
});

test("blocked browser storage cannot falsely clear a saved cart", () => {
  const item = { sku: "X", key: "X", name: "Produto", price: 12, quantidade: 1 };
  const { cart, getStore } = createCart(JSON.stringify([item]), true);
  let warning = "";
  cart.showToast = (text) => { warning = text; };
  assert.equal(cart.clear(), false);
  assert.equal(cart.getItemCount(), 1);
  assert.match(warning, /Não foi possível limpar/);
  assert.equal(JSON.parse(getStore()).length, 1);
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

test("blocked browser storage is visibly reported instead of claiming the cart was saved", () => {
  const { cart, getStore } = createCart("[]", true);
  let message = "";
  cart.showToast = (value) => { message = value; };
  assert.equal(cart.save([{ sku: "X", key: "X", name: "Item", price: 1, quantidade: 1 }]), false);
  cart.add({ sku: "X", name: "Item", price: 1 }, 1);
  assert.equal(getStore(), "[]");
  assert.match(message, /Não foi possível salvar/);
});

test("cart refuses to persist oversized product descriptions", () => {
  const { cart, getStore } = createCart();
  let message = "";
  cart.showToast = (value) => { message = value; };
  cart.add({ sku: "X", name: "Valid name", price: 10, desc: "X".repeat(128_001) }, 1);
  assert.equal(getStore(), "[]");
  assert.match(message, /Não foi possível salvar/);
});

test("checkout totals use only elements present and handle free shipping without PIX assumptions", () => {
  const checkout = fs.readFileSync(path.join(__dirname, "../checkout.html"), "utf8");
  const start = checkout.indexOf("function updateTotals() {");
  const end = checkout.indexOf("function goToStep(step)",start);
  assert.ok(start >= 0 && end > start);
  const segment = checkout.slice(start,end);
  const elements = Object.fromEntries(["co-subtotal","co-total","co-shipping"].map(id => [id,{textContent:""}]));
  const sandbox = {
    Cart: { getSubtotal: () => 120 },
    shippingCost: 0,
    shippingType: "",
    document: { getElementById(id) { assert.ok(elements[id],"unknown price element "+id); return elements[id]; } },
  };
  vm.runInNewContext(segment + "\nupdateTotals()",sandbox);
  assert.equal(elements["co-total"].textContent,"R$ 120,00");
  assert.equal(elements["co-shipping"].textContent,"Selecione o CEP");
  sandbox.shippingType="Retirada local";
  vm.runInNewContext("updateTotals()",sandbox);
  assert.equal(elements["co-shipping"].textContent,"R$ 0,00");
  sandbox.shippingCost=15.5;
  vm.runInNewContext("updateTotals()",sandbox);
  assert.equal(elements["co-total"].textContent,"R$ 135,50");
  assert.doesNotMatch(segment,/pix-total|pixTotal/);
});

test("BrasilAPI v2 address fills and invalidates stale shipping when CEP changes", async () => {
  const checkout = fs.readFileSync(path.join(__dirname, "../checkout.html"),"utf8");
  const start=checkout.indexOf("async function lookupCEP() {");
  const end=checkout.indexOf("async function calculateShipping(cep)",start);
  assert.ok(start >= 0 && end > start);
  const fields = {
    "f-cep": {value:"01310-100"},
    "f-rua": {value:""},
    "f-bairro": {value:""},
    "f-cidade": {value:""},
    "f-estado": {value:""},
    "shipping-options": {style:{display:"block"}},
    "shipping-list": {replaceChildren() { this.cleared=true; }},
  };
  let lookedUp="";
  let requested="";
  const sandbox = {
    shippingCost: 99,
    shippingType: "Old quote",
    document: {getElementById(id) { assert.ok(fields[id],"missing field "+id);return fields[id];}},
    updateTotals() {},
    fetch: async url => {
      requested=url;
      return {ok:true,json:async()=>({street:"Avenida Paulista",neighborhood:"Bela Vista",city:"São Paulo",state:"SP"})};
    },
    calculateShipping: cep => {lookedUp=cep;},
  };
  await vm.runInNewContext("(async()=>{"+checkout.slice(start,end)+";await lookupCEP()})()",sandbox);
  assert.equal(requested,"https://brasilapi.com.br/api/cep/v2/01310100");
  assert.equal(fields["f-rua"].value,"Avenida Paulista");
  assert.equal(fields["f-bairro"].value,"Bela Vista");
  assert.equal(fields["f-cidade"].value,"São Paulo");
  assert.equal(fields["f-estado"].value,"SP");
  assert.equal(lookedUp,"01310100");
  assert.equal(sandbox.shippingCost,0);
  assert.equal(sandbox.shippingType,"");
  assert.equal(fields["shipping-options"].style.display,"none");
  assert.equal(fields["shipping-list"].cleared,true);
});


test("checkout address accepts valid Brazilian CEP and rejects invalid or incomplete addresses", () => {
  const checkout = fs.readFileSync(path.join(__dirname, "../checkout.html"), "utf8");
  const start = checkout.indexOf("function validateStep2() {");
  const end = checkout.indexOf("function selectPayment(method", start);
  assert.ok(start >= 0 && end > start, "checkout address validation function must exist");
  const segment = checkout.slice(start, end);
  const values = {
    "f-cep": "01310-100",
    "f-rua": "Avenida Paulista",
    "f-numero": "100",
    "f-bairro": "Bela Vista",
    "f-cidade": "São Paulo",
    "f-estado": "SP",
  };
  const alerts = [];
  const sandbox = {
    document: { getElementById(id) {
      assert.ok(Object.hasOwn(values, id), "unexpected form field " + id);
      return { value: values[id] };
    }},
    alert: message => alerts.push(message),
  };
  const validate = () => vm.runInNewContext(segment + "\nvalidateStep2()", sandbox);
  assert.equal(validate(), true, "formatted 8-digit CEP should pass");
  values["f-cep"] = "01310100";
  assert.equal(validate(), true, "unformatted 8-digit CEP should pass");
  values["f-cep"] = "01310-10";
  assert.equal(validate(), false, "short CEP must fail");
  values["f-cep"] = "01310-100";
  values["f-cidade"] = "";
  assert.equal(validate(), false, "missing city must fail");
  values["f-cidade"] = "São Paulo";
  values["f-estado"] = "S";
  assert.equal(validate(), false, "invalid state code must fail");
  assert.equal(alerts.length, 3);
});


test("checkout inputs have programmatic labels and visible keyboard focus", () => {
  const checkout = fs.readFileSync(path.join(__dirname, "../checkout.html"), "utf8");
  const ids = [...checkout.matchAll(/<input[^>]*\bid="(f-[^"]+)"/g)].map(match => match[1]);
  assert.ok(ids.length >= 10, "expected all customer and address fields");
  for (const id of ids) {
    assert.match(checkout, new RegExp('<label[^>]+for="' + id + '"[^>]*>'), id + " needs a label");
  }
  assert.match(checkout, /\.form-input:focus-visible\s*\{[^}]*outline:/);
  assert.match(checkout, /prefers-reduced-motion:\s*reduce/);
});

test("checkout step navigation focuses heading and respects reduced motion", () => {
  const checkout = fs.readFileSync(path.join(__dirname, "../checkout.html"), "utf8");
  const start = checkout.indexOf("function goToStep(step) {");
  const end = checkout.indexOf("function validateStep1() {", start);
  assert.ok(start >= 0 && end > start);
  const segment = checkout.slice(start, end);
  const heading = { attrs: {}, setAttribute(name, value) { this.attrs[name] = value; }, focus(options) { this.focusOptions = options; } };
  const panels = [1, 2, 3].map(() => ({ style: {} }));
  const steps = [1, 2, 3].map(() => ({ classList: { remove() {}, add() {} } }));
  let scrollBehavior = "";
  const sandbox = {
    currentStep: 1,
    validateStep1: () => true,
    validateStep2: () => true,
    document: {
      getElementById(id) { return panels[Number(id.slice(-1)) - 1]; },
      querySelector(selector) {
        if (selector === "#step-2 h2") return heading;
        const match = selector.match(/\.step\[data-step="(\d)"\]/);
        return match ? steps[Number(match[1]) - 1] : null;
      },
    },
    window: {
      matchMedia: () => ({ matches: true }),
      scrollTo: options => { scrollBehavior = options.behavior; },
    },
  };
  vm.runInNewContext(segment + "\ngoToStep(2)", sandbox);
  assert.equal(sandbox.currentStep, 2);
  assert.equal(panels[1].style.display, "block");
  assert.equal(panels[0].style.display, "none");
  assert.equal(scrollBehavior, "auto");
  assert.equal(heading.attrs.tabindex, "-1");
  assert.equal(heading.focusOptions.preventScroll, true);
});
