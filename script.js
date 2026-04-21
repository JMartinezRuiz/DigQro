(function () {
  "use strict";

  var whatsappNumber = "524426000092";
  var defaultMessage =
    "Hola, quiero una demo gratuita para mejorar un proceso de mi negocio o condominio en Querétaro. ¿Podemos hablar?";
  var submitDefaultText = "Enviar consulta";

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

  function isValidPhone(phone) {
    var digits = phone.replace(/\D/g, "");
    var repeatedDigits = /^(\d)\1+$/.test(digits);

    if (repeatedDigits) {
      return false;
    }

    return /^[2-9]\d{9}$/.test(digits) ||
      /^52[2-9]\d{9}$/.test(digits) ||
      /^521[2-9]\d{9}$/.test(digits);
  }

  function setSubmitState(button, state) {
    if (!button) {
      return;
    }

    button.classList.toggle("is-submitting", state === "submitting");
    button.classList.toggle("is-success", state === "success");
    button.disabled = state === "submitting" || state === "success";

    if (state === "submitting") {
      button.textContent = "Enviando consulta";
    } else if (state === "success") {
      button.textContent = "Consulta enviada";
    } else {
      button.textContent = submitDefaultText;
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
  var submitButton = document.querySelector("[data-submit-button]");

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
    form.noValidate = true;
    form.addEventListener("input", updateWhatsAppLink);
    updateWhatsAppLink();

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var name = getTrimmedValue(form, "name");
      var business = getTrimmedValue(form, "business");
      var phone = getTrimmedValue(form, "phone");
      var message = getTrimmedValue(form, "message");
      var hasError = false;

      setFieldState(form, "name", false);
      setFieldState(form, "business", false);
      setFieldState(form, "phone", false);
      setFieldState(form, "message", false);

      if (name.length < 2) {
        setFieldState(form, "name", true);
        hasError = true;
      }

      if (business.length < 2) {
        setFieldState(form, "business", true);
        hasError = true;
      }

      if (!isValidPhone(phone)) {
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
          ? "Rellena todos los campos. El teléfono debe tener 10 dígitos o formato +52."
          : "";
      }

      if (hasError) {
        setSubmitState(submitButton, "idle");
        return;
      }

      setSubmitState(submitButton, "submitting");

      if (!window.fetch) {
        form.submit();
        return;
      }

      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: {
          Accept: "application/json",
        },
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Formspree rejected the submission");
          }

          form.reset();
          updateWhatsAppLink();

          if (status) {
            status.classList.remove("error");
            status.textContent = "Consulta enviada. Te contactaremos lo antes posible.";
          }

          setSubmitState(submitButton, "success");

          window.setTimeout(function () {
            setSubmitState(submitButton, "idle");
          }, 4200);
        })
        .catch(function () {
          if (status) {
            status.classList.add("error");
            status.textContent = "No se pudo enviar. Inténtalo de nuevo o escríbenos por WhatsApp.";
          }

          setSubmitState(submitButton, "idle");
        });
    });
  }
})();
