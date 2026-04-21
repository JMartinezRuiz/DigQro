(function () {
  "use strict";

  var whatsappNumber = "524426000092";
  var contactEmail = "contacto@digitalizacionqueretaro.com";
  var defaultMessage =
    "Hola, quiero una demo gratuita para mejorar un proceso de mi negocio o condominio en Querétaro. ¿Podemos hablar?";

  function buildWhatsAppUrl(message) {
    return "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(message);
  }

  function getTrimmedValue(form, name) {
    var field = form.elements[name];
    return field && "value" in field ? field.value.trim() : "";
  }

  function setFieldState(form, name, invalid) {
    var field = form.elements[name];
    if (field) {
      field.setAttribute("aria-invalid", invalid ? "true" : "false");
    }
  }

  var menuToggle = document.querySelector("[data-menu-toggle]");
  var navLinks = document.querySelector("[data-nav-links]");

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", function () {
      var isOpen = navLinks.classList.toggle("open");
      document.body.classList.toggle("menu-open", isOpen);
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
    });

    navLinks.addEventListener("click", function (event) {
      if (event.target instanceof HTMLAnchorElement) {
        navLinks.classList.remove("open");
        document.body.classList.remove("menu-open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Abrir menú");
      }
    });
  }

  var year = document.querySelector("[data-year]");
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  var form = document.getElementById("lead-form");
  var status = document.querySelector("[data-form-status]");
  var whatsappFormLink = document.querySelector("[data-whatsapp-form]");

  function getPreparedMessage() {
    if (!form) {
      return defaultMessage;
    }

    var name = getTrimmedValue(form, "name") || "-";
    var business = getTrimmedValue(form, "business") || "-";
    var phone = getTrimmedValue(form, "phone") || "-";
    var message = getTrimmedValue(form, "message") || "-";

    return [
      "Hola, quiero solicitar una demo gratuita.",
      "Nombre: " + name,
      "Negocio o condominio: " + business,
      "Teléfono: " + phone,
      "Necesidad: " + message,
    ].join("\n");
  }

  function updateWhatsAppLink() {
    if (whatsappFormLink) {
      whatsappFormLink.setAttribute("href", buildWhatsAppUrl(getPreparedMessage()));
    }
  }

  if (form) {
    form.addEventListener("input", updateWhatsAppLink);
    updateWhatsAppLink();

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var name = getTrimmedValue(form, "name");
      var business = getTrimmedValue(form, "business");
      var phone = getTrimmedValue(form, "phone");
      var message = getTrimmedValue(form, "message");
      var phoneDigits = phone.replace(/\D/g, "");
      var hasError = false;

      setFieldState(form, "name", false);
      setFieldState(form, "phone", false);
      setFieldState(form, "message", false);

      if (name.length < 2) {
        setFieldState(form, "name", true);
        hasError = true;
      }

      if (phoneDigits.length < 8) {
        setFieldState(form, "phone", true);
        hasError = true;
      }

      if (message.length < 10) {
        setFieldState(form, "message", true);
        hasError = true;
      }

      if (status) {
        status.classList.toggle("error", hasError);
        status.textContent = hasError
          ? "Revisa nombre, teléfono y mensaje antes de enviar."
          : "Consulta preparada en tu cliente de correo.";
      }

      if (hasError) {
        return;
      }

      var subject = "Consulta desde la web - " + (business || name);
      var body = [
        "Nombre: " + name,
        "Negocio o condominio: " + (business || "No indicado"),
        "Teléfono: " + phone,
        "",
        message,
      ].join("\n");

      window.location.href =
        "mailto:" +
        contactEmail +
        "?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(body);
    });
  }
})();
