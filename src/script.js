const App = {
  state: {
    cart: JSON.parse(localStorage.getItem("vogue_elite_cart")) || [],
    selectedProduct: null,
    selectedSize: null,
    currentQty: 1,
    isProcessingOrder: false,
  },

  init() {
    this.renderProducts();
    this.setupEventListeners();
    this.updateCartUI();
    this.loadCustData();
    this.handlePaymentUI();
    this.setupCategoryFilters();
  },

  renderProducts() {
    const grid = document.getElementById("product-grid");
    if (!grid) return;

    grid.innerHTML = PRODUCTS_DB.map(
      (p) => `
      <div class="product-card reveal opacity-0" data-id="${p.id}">
        <div class="relative aspect-[3/4] mb-6 overflow-hidden bg-gray-50 group">
          <img src="${
            p.image
          }" class="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110">
          <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button data-product-id="${
              p.id
            }" class="btn-explore bg-white text-black px-6 py-3 text-[9px] font-bold uppercase tracking-widest translate-y-4 group-hover:translate-y-0 transition-all duration-500">Explorar Detalhes</button>
          </div>
        </div>
        <div>
          <span class="text-[8px] text-gold font-bold uppercase tracking-widest">${
            p.category
          }</span>
          <h3 class="font-luxury text-xl mt-1 italic">${p.name}</h3>
          <p class="text-[11px] font-light text-gray-400 mt-1">R$ ${p.price.toLocaleString(
            "pt-BR",
            { minimumFractionDigits: 2 }
          )}</p>
        </div>
      </div>
    `
    ).join("");
    this.initScrollReveal();
  },

  openProductModal(id) {
    const product = PRODUCTS_DB.find((p) => p.id === id);
    if (!product) return;

    this.state.selectedProduct = product;
    this.state.selectedSize = null;
    this.state.currentQty = 1;

    document.getElementById("modal-image").src = product.image;
    document.getElementById("modal-name").innerText = product.name;
    document.getElementById("modal-category").innerText = product.category;
    document.getElementById("modal-description").innerText =
      product.description;
    document.getElementById("modal-qty").value = 1;
    document.getElementById(
      "modal-price"
    ).innerText = `R$ ${product.price.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    })}`;

    const sizeBox = document.getElementById("modal-sizes");
    sizeBox.innerHTML = product.sizes
      .map(
        (s) => `
      <button data-size="${s}" class="size-btn border border-gray-100 px-5 py-2 text-[10px] hover:border-black transition-all ${
          s === "U" ? "bg-black text-white border-black" : ""
        }">${s}</button>
    `
      )
      .join("");

    // Selecionar primeiro tamanho automaticamente se for único
    if (product.sizes.length === 1) {
      this.state.selectedSize = product.sizes[0];
      const firstBtn = sizeBox.querySelector(".size-btn");
      if (firstBtn) {
        firstBtn.classList.add("bg-black", "text-white", "border-black");
      }
    }

    this.toggleModal("product-modal", true);
  },

  changeQty(val) {
    const newQty = this.state.currentQty + val;
    if (newQty >= 1) {
      this.state.currentQty = newQty;
      document.getElementById("modal-qty").value = newQty;
    }
  },

  selectSize(size, el) {
    this.state.selectedSize = size;
    document
      .querySelectorAll(".size-btn")
      .forEach((b) =>
        b.classList.remove("bg-black", "text-white", "border-black")
      );
    el.classList.add("bg-black", "text-white", "border-black");
  },

  addToCart() {
    if (!this.state.selectedProduct) {
      this.showToast("Nenhum produto selecionado");
      return;
    }

    if (
      !this.state.selectedSize &&
      this.state.selectedProduct.sizes.length > 0
    ) {
      this.showToast("Por favor, escolha um tamanho");
      return;
    }

    const item = {
      ...this.state.selectedProduct,
      size: this.state.selectedSize || "Único",
      qty: this.state.currentQty,
      uniqueKey: `${this.state.selectedProduct.id}-${
        this.state.selectedSize || "unico"
      }-${Date.now()}`,
    };

    // Verificar se já existe item igual no carrinho
    const existingIndex = this.state.cart.findIndex(
      (i) => i.id === item.id && i.size === item.size
    );

    if (existingIndex > -1) {
      // Atualizar quantidade do item existente
      this.state.cart[existingIndex].qty += item.qty;
    } else {
      // Adicionar novo item
      this.state.cart.push(item);
    }

    this.updateCartUI();
    this.toggleModal("product-modal", false);
    this.showToast("Peça adicionada à Bag");

    // Resetar estado
    this.state.selectedProduct = null;
    this.state.selectedSize = null;
    this.state.currentQty = 1;
  },

  updateCartUI() {
    const container = document.getElementById("cart-items");
    const countBadge = document.getElementById("cart-count");
    const totalLabel = document.getElementById("cart-total");

    if (!container || !countBadge || !totalLabel) return;

    const totalQty = this.state.cart.reduce((acc, curr) => acc + curr.qty, 0);
    countBadge.innerText = totalQty;
    countBadge.style.opacity = totalQty > 0 ? "1" : "0";

    if (this.state.cart.length === 0) {
      container.innerHTML = `<div class="h-64 flex items-center justify-center opacity-30 text-[9px] uppercase tracking-widest">Sua Bag está vazia</div>`;
    } else {
      container.innerHTML = this.state.cart
        .map(
          (item, idx) => `
        <div class="flex gap-4 border-b border-gray-50 pb-6 animate-fade-in-up">
          <div class="w-16 h-20 bg-gray-50 flex-shrink-0">
            <img src="${item.image}" class="w-full h-full object-cover" alt="${
            item.name
          }">
          </div>
          <div class="flex-grow">
            <div class="flex justify-between">
              <h4 class="text-xs font-luxury italic">${item.name}</h4>
              <button data-index="${idx}" class="btn-remove-item text-gray-300 hover:text-black">
                <i class="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
            <p class="text-[8px] text-gray-400 mt-1 uppercase tracking-widest">
              Tam: ${item.size} | Qty: ${item.qty}
            </p>
            <p class="text-xs mt-2 font-medium">
              R$ ${(item.price * item.qty).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>
      `
        )
        .join("");
    }

    const subtotal = this.state.cart.reduce(
      (acc, curr) => acc + curr.price * curr.qty,
      0
    );
    totalLabel.innerText = `R$ ${subtotal.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    })}`;

    // Salvar no localStorage
    try {
      localStorage.setItem("vogue_elite_cart", JSON.stringify(this.state.cart));
    } catch (e) {
      console.error("Erro ao salvar carrinho:", e);
    }
  },

  removeFromCart(idx) {
    if (idx >= 0 && idx < this.state.cart.length) {
      this.state.cart.splice(idx, 1);
      this.updateCartUI();
    }
  },

  toggleCart(open) {
    const sidebar = document.getElementById("cart-sidebar");
    const aside = sidebar.querySelector("aside");
    const overlay = document.getElementById("cart-overlay");

    if (open) {
      sidebar.classList.remove("invisible");
      setTimeout(() => {
        overlay.classList.add("opacity-100");
        aside.classList.remove("translate-x-full");
      }, 10);
      document.body.classList.add("no-scroll");
    } else {
      overlay.classList.remove("opacity-100");
      aside.classList.add("translate-x-full");
      setTimeout(() => sidebar.classList.add("invisible"), 500);
      document.body.classList.remove("no-scroll");
    }
  },

  toggleModal(id, open) {
    const modal = document.getElementById(id);
    const overlay = modal.querySelector(".sidebar-overlay");
    const content = modal.querySelector("div:not(.sidebar-overlay)");

    if (open) {
      modal.classList.remove("invisible");
      setTimeout(() => {
        overlay.classList.add("opacity-100");
        content.classList.replace("scale-95", "scale-100");
        content.classList.replace("opacity-0", "opacity-100");
      }, 10);
      document.body.classList.add("no-scroll");
    } else {
      overlay.classList.remove("opacity-100");
      content.classList.replace("scale-100", "scale-95");
      content.classList.replace("opacity-100", "opacity-0");
      setTimeout(() => modal.classList.add("invisible"), 500);
      document.body.classList.remove("no-scroll");
    }
  },

  toggleMobileMenu(open) {
    const menu = document.getElementById("mobile-menu");
    const overlay = document.getElementById("mobile-menu-overlay");
    const aside = menu.querySelector("aside");

    if (open) {
      menu.classList.remove("invisible");
      setTimeout(() => {
        overlay.classList.add("opacity-100");
        aside.classList.remove("translate-x-full");
      }, 10);
      document.body.classList.add("no-scroll");
    } else {
      overlay.classList.remove("opacity-100");
      aside.classList.add("translate-x-full");
      setTimeout(() => menu.classList.add("invisible"), 500);
      document.body.classList.remove("no-scroll");
    }
  },

  handlePaymentUI() {
    const method =
      document.querySelector('input[name="payment"]:checked')?.value || "Pix";
    const pixBox = document.getElementById("pix-details");
    if (pixBox) {
      pixBox.style.display = method === "Pix" ? "block" : "none";
    }
  },

  autoSaveCustData() {
    const feedback = document.getElementById("save-feedback");
    if (!feedback) return;

    const data = {
      name: document.getElementById("cust-name")?.value || "",
      phone: document.getElementById("cust-phone")?.value || "",
      cep: document.getElementById("cust-cep")?.value || "",
      street: document.getElementById("cust-street")?.value || "",
      number: document.getElementById("cust-number")?.value || "",
      neighborhood: document.getElementById("cust-neighborhood")?.value || "",
      city: document.getElementById("cust-city")?.value || "",
      state: document.getElementById("cust-state")?.value || "",
      ref: document.getElementById("cust-ref")?.value || "",
      payment:
        document.querySelector('input[name="payment"]:checked')?.value || "Pix",
    };

    try {
      localStorage.setItem("vogue_elite_customer", JSON.stringify(data));
      feedback.classList.remove("opacity-0");
      setTimeout(() => feedback.classList.add("opacity-0"), 1500);
    } catch (e) {
      console.error("Erro ao salvar dados:", e);
    }
  },

  loadCustData() {
    try {
      const saved = localStorage.getItem("vogue_elite_customer");
      if (saved) {
        const data = JSON.parse(saved);

        const fields = {
          "cust-name": data.name,
          "cust-phone": data.phone,
          "cust-cep": data.cep,
          "cust-street": data.street,
          "cust-number": data.number,
          "cust-neighborhood": data.neighborhood,
          "cust-city": data.city,
          "cust-state": data.state,
          "cust-ref": data.ref,
        };

        Object.entries(fields).forEach(([id, value]) => {
          const element = document.getElementById(id);
          if (element && value !== undefined) {
            element.value = value;
          }
        });

        // Restaurar método de pagamento
        if (data.payment) {
          const paymentRadio = document.querySelector(
            `input[value="${data.payment}"]`
          );
          if (paymentRadio) {
            paymentRadio.checked = true;
            this.handlePaymentUI();
          }
        }
      }
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    }
  },

  clearCustomerData() {
    try {
      localStorage.removeItem("vogue_elite_customer");

      const fields = [
        "cust-name",
        "cust-phone",
        "cust-cep",
        "cust-street",
        "cust-number",
        "cust-neighborhood",
        "cust-city",
        "cust-state",
        "cust-ref",
      ];

      fields.forEach((id) => {
        const field = document.getElementById(id);
        if (field) {
          field.value = "";
          field.classList.remove("invalid");
        }
      });

      // Resetar pagamento para Pix
      const pixRadio = document.querySelector('input[value="Pix"]');
      if (pixRadio) {
        pixRadio.checked = true;
        this.handlePaymentUI();
      }

      this.showToast("Dados removidos com sucesso.");
    } catch (e) {
      console.error("Erro ao limpar dados:", e);
      this.showToast("Erro ao limpar dados.");
    }
  },

  validateCheckoutForm() {
    const requiredFields = [
      "cust-name",
      "cust-phone",
      "cust-cep",
      "cust-street",
      "cust-number",
      "cust-neighborhood",
      "cust-city",
      "cust-state",
    ];

    let isValid = true;
    let firstInvalidField = null;

    // Remover erros anteriores
    requiredFields.forEach((id) => {
      const field = document.getElementById(id);
      if (field) field.classList.remove("invalid", "validation-error");
    });

    // Validar cada campo
    requiredFields.forEach((id) => {
      const field = document.getElementById(id);
      if (!field || field.value.trim() === "") {
        field.classList.add("invalid");
        field.classList.add("validation-error");
        setTimeout(() => field.classList.remove("validation-error"), 300);
        isValid = false;
        if (!firstInvalidField) firstInvalidField = field;
      }
    });

    // Focar no primeiro campo inválido
    if (firstInvalidField) {
      firstInvalidField.focus();
    }

    return isValid;
  },

  getFormData() {
    return {
      nome: document.getElementById("cust-name")?.value.trim() || "",
      fone: document.getElementById("cust-phone")?.value.trim() || "",
      cep: document.getElementById("cust-cep")?.value.trim() || "",
      rua: document.getElementById("cust-street")?.value.trim() || "",
      numero: document.getElementById("cust-number")?.value.trim() || "",
      bairro: document.getElementById("cust-neighborhood")?.value.trim() || "",
      cidade: document.getElementById("cust-city")?.value.trim() || "",
      estado: document.getElementById("cust-state")?.value.trim() || "",
      referencia: document.getElementById("cust-ref")?.value.trim() || "",
      pagamento:
        document.querySelector('input[name="payment"]:checked')?.value || "Pix",
    };
  },

  handleCheckout(e) {
    e.preventDefault();

    // Evitar múltiplos envios
    if (this.state.isProcessingOrder) {
      this.showToast("Aguarde, processando pedido anterior...");
      return;
    }

    // Validar campos obrigatórios
    if (!this.validateCheckoutForm()) {
      this.showToast("Preencha todos os campos obrigatórios (*)");
      return;
    }

    // Validar sacola
    if (this.state.cart.length === 0) {
      this.showToast("Sua sacola está vazia");
      return;
    }

    // Iniciar processamento
    this.state.isProcessingOrder = true;
    const confirmBtn = document.getElementById("btn-confirm-order");
    const originalText = confirmBtn.textContent;
    confirmBtn.textContent = "PROCESSANDO...";
    confirmBtn.disabled = true;
    confirmBtn.classList.add("opacity-70");

    try {
      // Obter dados do formulário
      const client = this.getFormData();

      // Calcular total
      const total = this.state.cart.reduce(
        (acc, curr) => acc + curr.price * curr.qty,
        0
      );

      // Formatar mensagem do WhatsApp
      const whatsappMessage = this.formatWhatsAppMessage(client, total);

      // DEBUG no console
      console.log("Mensagem WhatsApp gerada:");
      console.log(whatsappMessage);

      // Codificar mensagem para URL
      const encodedMessage = encodeURIComponent(whatsappMessage);

      // Número de WhatsApp (altere para o número correto)
      const whatsappNumber = "5588994202290";

      // Abrir WhatsApp em nova aba
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
      window.open(whatsappUrl, "_blank");

      // Limpar sacola após envio
      this.state.cart = [];
      this.updateCartUI();

      // Fechar modal após delay
      setTimeout(() => {
        this.toggleModal("checkout-modal", false);
        this.showToast("✅ Pedido enviado com sucesso!");
      }, 1000);
    } catch (error) {
      console.error("Erro no checkout:", error);
      this.showToast("❌ Erro ao processar pedido. Tente novamente.");
    } finally {
      // Restaurar botão após 2 segundos
      setTimeout(() => {
        this.state.isProcessingOrder = false;
        confirmBtn.textContent = originalText;
        confirmBtn.disabled = false;
        confirmBtn.classList.remove("opacity-70");
      }, 2000);
    }
  },

  formatWhatsAppMessage(client, total) {
    const timestamp = new Date().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    let message = `*VOGUE ELITE - NOVO PEDIDO*\n\n`;

    // Dados do cliente (ESCRITOS COMPLETAMENTE)
    message += `*DADOS DO CLIENTE*\n`;
    message += `Nome: ${client.nome.toUpperCase()}\n`;
    message += `Telefone/WhatsApp: ${client.fone}\n\n`;

    // Endereço (ESCRITOS COMPLETAMENTE)
    message += `*ENDEREÇO DE ENTREGA*\n`;
    message += `Rua: ${client.rua}\n`;
    message += `Número: ${client.numero}\n`;
    message += `Bairro: ${client.bairro}\n`;
    message += `Cidade: ${client.cidade}\n`;
    message += `Estado: ${client.estado}\n`;
    message += `CEP: ${client.cep}\n`;
    if (client.referencia) {
      message += `Ponto de Referência: ${client.referencia}\n`;
    }
    message += `\n`;

    // Produtos (ESCRITOS COMPLETAMENTE)
    message += `*PRODUTOS SELECIONADOS*\n`;
    this.state.cart.forEach((item, index) => {
      const subtotal = item.price * item.qty;
      message += `Produto ${index + 1}: ${item.name}\n`;
      message += `Tamanho: ${item.size}\n`;
      message += `Quantidade: ${item.qty}\n`;
      message += `Preço unitário: R$ ${item.price.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })}\n`;
      message += `Subtotal: R$ ${subtotal.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })}\n\n`;
    });

    // Total
    message += `*TOTAL DO PEDIDO*\n`;
    message += `R$ ${total.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    })}\n\n`;

    // Pagamento
    message += `*FORMA DE PAGAMENTO*\n`;
    message += `${client.pagamento}\n\n`;

    // Aviso PIX (ESCRITO COMPLETAMENTE)
    if (client.pagamento === "Pix") {
      message += `*IMPORTANTE - PAGAMENTO VIA PIX*\n`;
      message += `Chave PIX (CNPJ): 00.000.000/0001-00\n`;
      message += `Pedido confirmado SOMENTE após envio do comprovante para este WhatsApp.\n\n`;
    }

    // Footer
    message += `--------------------------------\n`;
    message += `Data do pedido: ${timestamp}\n`;
    message += `Pedido realizado via Website Vogue Elite`;

    return message;
  },

  showToast(msg) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.innerText = msg;
    toast.classList.remove("translate-y-20", "opacity-0");

    setTimeout(() => {
      toast.classList.add("translate-y-20", "opacity-0");
    }, 3000);
  },

  initScrollReveal() {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("animate-fade-in-up");
            e.target.classList.remove("opacity-0");
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
  },

  setupCategoryFilters() {
    const buttons = document.querySelectorAll(".category-filter");

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const category = button.getAttribute("data-tag");

        // Atualizar botão ativo
        buttons.forEach((btn) => {
          btn.classList.remove(
            "active",
            "bg-gold",
            "text-white",
            "border-gold"
          );
          btn.classList.add("text-gray-600", "border-gray-300");
        });
        button.classList.add("active", "bg-gold", "text-white", "border-gold");
        button.classList.remove("text-gray-600", "border-gray-300");

        // Filtrar produtos
        const products = document.querySelectorAll(".product-card");
        let visibleCount = 0;

        products.forEach((product) => {
          const productId = parseInt(product.getAttribute("data-id"));
          const productData = PRODUCTS_DB.find((p) => p.id === productId);

          if (!productData) {
            product.style.display = "none";
            return;
          }

          // Normalizar categorias para comparação
          const productCategory = productData.category.toLowerCase();
          const filterCategory = category.toLowerCase();

          // Mostrar todos ou filtrar por categoria
          if (category === "todos" || productCategory === filterCategory) {
            product.style.display = "block";
            visibleCount++;

            // Animar entrada
            product.classList.remove("opacity-0");
            setTimeout(() => {
              product.classList.add("animate-fade-in-up");
            }, 50);
          } else {
            // Animar saída
            product.classList.remove("animate-fade-in-up");
            setTimeout(() => {
              product.style.display = "none";
              product.classList.add("opacity-0");
            }, 300);
          }
        });

        // Mostrar mensagem se nenhum produto for encontrado
        const grid = document.getElementById("product-grid");
        const existingMessage = grid.querySelector(".no-products-message");

        if (visibleCount === 0 && category !== "todos") {
          if (!existingMessage) {
            const message = document.createElement("div");
            message.className =
              "no-products-message col-span-full text-center py-20 animate-fade-in-up";
            message.innerHTML = `
            <i class="fa-solid fa-shirt text-gray-300 text-4xl mb-4"></i>
            <p class="text-gray-400 text-sm font-light mb-2">Nenhum produto encontrado em "${category}"</p>
            <button class="back-to-all-btn text-[9px] uppercase tracking-widest text-gold hover:text-black transition-colors">
              Voltar para Todos
            </button>
          `;
            grid.appendChild(message);

            // Adicionar evento ao botão "Voltar para Todos"
            setTimeout(() => {
              const backBtn = message.querySelector(".back-to-all-btn");
              if (backBtn) {
                backBtn.addEventListener("click", () => {
                  const todosBtn = document.querySelector('[data-tag="todos"]');
                  if (todosBtn) todosBtn.click();
                });
              }
            }, 100);
          }
        } else {
          // Remover mensagem se existir
          if (existingMessage) {
            existingMessage.remove();
          }
        }

        // Log para debug (remova em produção)
        console.log(`Filtro: ${category}, Produtos visíveis: ${visibleCount}`);
      });
    });
  },
  setupEventListeners() {
    // Event Delegation para produtos
    document.addEventListener("click", (e) => {
      // Botões "Explorar Detalhes"
      if (
        e.target.classList.contains("btn-explore") ||
        e.target.closest(".btn-explore")
      ) {
        const button = e.target.classList.contains("btn-explore")
          ? e.target
          : e.target.closest(".btn-explore");
        const productId = parseInt(button.getAttribute("data-product-id"));
        if (productId) {
          this.openProductModal(productId);
        }
      }

      // Botões de tamanho no modal
      if (
        e.target.classList.contains("size-btn") ||
        e.target.closest(".size-btn")
      ) {
        const button = e.target.classList.contains("size-btn")
          ? e.target
          : e.target.closest(".size-btn");
        const size = button.getAttribute("data-size");
        if (size) {
          this.selectSize(size, button);
        }
      }

      // Botões de remover item do carrinho
      if (
        e.target.classList.contains("btn-remove-item") ||
        e.target.closest(".btn-remove-item")
      ) {
        const button = e.target.classList.contains("btn-remove-item")
          ? e.target
          : e.target.closest(".btn-remove-item");
        const index = parseInt(button.getAttribute("data-index"));
        if (!isNaN(index)) {
          this.removeFromCart(index);
        }
      }
    });

    // Nav & Cart
    document
      .getElementById("btn-cart")
      ?.addEventListener("click", () => this.toggleCart(true));
    document
      .getElementById("close-cart")
      ?.addEventListener("click", () => this.toggleCart(false));
    document
      .getElementById("cart-overlay")
      ?.addEventListener("click", () => this.toggleCart(false));

    // Botões de quantidade no modal
    document
      .getElementById("btn-decrease-qty")
      ?.addEventListener("click", () => this.changeQty(-1));
    document
      .getElementById("btn-increase-qty")
      ?.addEventListener("click", () => this.changeQty(1));

    // Botão "Adicionar à Bag" no modal
    document
      .getElementById("btn-add-to-cart")
      ?.addEventListener("click", () => this.addToCart());

    // Mobile Menu
    document
      .getElementById("btn-mobile-menu")
      ?.addEventListener("click", () => this.toggleMobileMenu(true));
    document
      .getElementById("close-mobile-menu")
      ?.addEventListener("click", () => this.toggleMobileMenu(false));
    document
      .getElementById("mobile-menu-overlay")
      ?.addEventListener("click", () => this.toggleMobileMenu(false));

    document.querySelectorAll(".mobile-nav-link").forEach((l) => {
      l.addEventListener("click", () => this.toggleMobileMenu(false));
    });

    // Modals
    document
      .getElementById("close-modal")
      ?.addEventListener("click", () =>
        this.toggleModal("product-modal", false)
      );
    document
      .getElementById("modal-overlay")
      ?.addEventListener("click", () =>
        this.toggleModal("product-modal", false)
      );

    // Checkout
    document
      .getElementById("btn-checkout-trigger")
      ?.addEventListener("click", () => {
        if (this.state.cart.length === 0) {
          this.showToast("Adicione peças à Bag primeiro");
          return;
        }
        this.toggleCart(false);
        setTimeout(() => this.toggleModal("checkout-modal", true), 400);
      });

    document
      .getElementById("close-checkout")
      ?.addEventListener("click", () =>
        this.toggleModal("checkout-modal", false)
      );
    document
      .getElementById("checkout-overlay")
      ?.addEventListener("click", () =>
        this.toggleModal("checkout-modal", false)
      );

    // Botão para limpar dados
    document
      .getElementById("btn-clear-data")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.clearCustomerData();
      });

    // Formulário de checkout
    const checkoutForm = document.getElementById("checkout-form");
    if (checkoutForm) {
      checkoutForm.addEventListener("submit", (e) => this.handleCheckout(e));
    }

    // Auto-save nos inputs do checkout
    const inputs = document.querySelectorAll(
      "#checkout-form input:not([type='radio'])"
    );
    inputs.forEach((input) => {
      input.addEventListener("input", () => this.autoSaveCustData());
    });

    // Auto-save nos radio buttons de pagamento
    document.querySelectorAll('input[name="payment"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        this.autoSaveCustData();
        this.handlePaymentUI();
      });
    });

    // Fechar modais com ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.toggleModal("product-modal", false);
        this.toggleModal("checkout-modal", false);
        this.toggleCart(false);
        this.toggleMobileMenu(false);
      }
    });

    // Navbar scroll effect
    window.addEventListener("scroll", () => {
      const nav = document.getElementById("navbar");
      if (!nav) return;

      if (window.scrollY > 50) {
        nav.classList.add("shadow-sm", "py-2");
        nav.classList.remove("py-4");
      } else {
        nav.classList.remove("shadow-sm", "py-2");
        nav.classList.add("py-4");
      }
    });
  },
};

// Inicializar quando o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => App.init());
} else {
  App.init();
}
