// /src/gsheets-loader.js
/**
 * Módulo de Integração Google Sheets
 * Responsável por carregar, converter e disponibilizar dados de estoque
 */

const SheetsLoader = {
  CSV_URL:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuaeEprSSGIWQgzbvnI42o9l19gNM-EBq8vOl991WXLvW9S27_EnDxgG2yas1ucj7k1UQxoe0rw8ij/pub?output=csv",

  _cache: {
    data: null,
    timestamp: null,
    ttl: 1 * 60 * 1000,
  },

  sanitize(str) {
    if (typeof str !== "string") return "";
    const div = document.createElement("div");
    div.textContent = str.trim();
    return div.innerHTML;
  },

  parsePrice(priceStr) {
    if (!priceStr || typeof priceStr !== "string") return 0;
    let cleaned = priceStr.replace(/[R\$\s]/g, "").trim();
    if (!cleaned) return 0;
    if (cleaned.includes(",")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    }
    const price = parseFloat(cleaned);
    return isNaN(price) ? 0 : price;
  },

  parseStock(stockStr) {
    if (!stockStr || typeof stockStr !== "string") return null;

    const cleaned = stockStr.toString().trim();
    const lower = cleaned.toLowerCase();

    // Tenta converter para número primeiro
    const parsed = parseInt(cleaned);
    if (!isNaN(parsed)) {
      return parsed;
    }

    // Se não é número, interpreta o texto
    if (
      lower.includes("indispon") ||
      lower.includes("esgotado") ||
      lower.includes("fora") ||
      lower.includes("não") ||
      lower.includes("nao") ||
      lower.includes("zero") ||
      lower.includes("sem") ||
      lower === "0" ||
      lower === "n"
    ) {
      return 0;
    }

    if (
      lower.includes("dispon") ||
      lower.includes("sim") ||
      lower.includes("ok") ||
      lower.includes("tem") ||
      lower.includes("s") ||
      lower === "1"
    ) {
      return 99;
    }

    // Se não reconheceu, trata como disponível (padrão)
    return 99;
  },

  async fetchData(force = false) {
    if (!force && this._cache.data && this._cache.timestamp) {
      const cacheAge = Date.now() - this._cache.timestamp;
      if (cacheAge < this._cache.ttl) {
        return this._cache.data;
      }
    }

    try {
      const response = await fetch(this.CSV_URL + "&t=" + Date.now());

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const csvText = await response.text();

      const data = this.parseCSV(csvText);

      this._cache.data = data;
      this._cache.timestamp = Date.now();

      return data;
    } catch (error) {
      console.error("❌ Erro ao carregar planilha:", error);
      throw error;
    }
  },

  parseCSV(csv) {
    if (!csv || typeof csv !== "string") return [];

    const lines = csv.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      return [];
    }

    const headers = lines[0]
      .split(",")
      .map((h) => this.sanitize(h.toLowerCase().trim()));

    // Mapeia colunas
    const nameIndex = headers.findIndex(
      (h) => h.includes("nome") || h.includes("produto") || h.includes("item"),
    );

    const qtyIndex = headers.findIndex(
      (h) =>
        h.includes("disponibilidade") ||
        h.includes("estoque") ||
        h.includes("quantidade") ||
        h.includes("qtd") ||
        h.includes("disp"),
    );

    const priceIndex = headers.findIndex(
      (h) =>
        h.includes("preço") ||
        h.includes("preco") ||
        h.includes("valor") ||
        h.includes("price") ||
        h.includes("r$"),
    );

    const sizeIndex = headers.findIndex(
      (h) =>
        h.includes("tamanho") ||
        h.includes("tam") ||
        h.includes("grade") ||
        h.includes("size"),
    );

    if (nameIndex === -1) {
      return [];
    }

    const products = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this._parseCSVLine(lines[i]);
      if (values.length === 0 || values.every((v) => !v)) continue;

      const name = this.sanitize(values[nameIndex] || "");
      if (!name) continue;

      // ESTOQUE
      let quantity = null;
      if (qtyIndex !== -1 && values[qtyIndex]) {
        quantity = this.parseStock(values[qtyIndex].toString());
      }

      // PREÇO
      let price = 0;
      if (priceIndex !== -1 && values[priceIndex]) {
        price = this.parsePrice(values[priceIndex].toString());
      }

      // TAMANHOS
      let sizes = [];
      if (sizeIndex !== -1 && values[sizeIndex]) {
        sizes = values[sizeIndex]
          .split(/[;,|]/)
          .map((s) => s.trim())
          .filter(Boolean);
      }

      const matchedProduct = this._findMatchingProduct(name);

      products.push({
        name,
        quantity,
        price,
        sizes,
        matchedProduct,
      });
    }

    return products;
  },

  _parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);

    return result.map((v) => v.trim().replace(/^"|"$/g, ""));
  },

  _findMatchingProduct(sheetName) {
    if (typeof PRODUCTS_DB === "undefined") return null;

    const normalized = sheetName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    // Match exato
    let match = PRODUCTS_DB.find((p) => {
      const pName = p.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
      return pName === normalized;
    });

    // Match parcial
    if (!match) {
      match = PRODUCTS_DB.find((p) => {
        const pName = p.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
        return pName.includes(normalized) || normalized.includes(pName);
      });
    }

    return match || null;
  },

  getProductMergeMap(sheetData) {
    const mergeMap = {};

    sheetData.forEach((item) => {
      if (item.matchedProduct) {
        const id = item.matchedProduct.id;

        // Determina estoque
        const hasQuantity =
          item.quantity !== null && item.quantity !== undefined;
        const quantity = hasQuantity ? item.quantity : 99;
        const inStock = quantity > 0;

        mergeMap[id] = {
          quantity: quantity,
          inStock: inStock,
          fromSheet: hasQuantity,

          price: item.price > 0 ? item.price : item.matchedProduct.price,
          sizes: item.sizes.length > 0 ? item.sizes : item.matchedProduct.sizes,
          name: item.matchedProduct.name,
        };
      }
    });

    return mergeMap;
  },
};
