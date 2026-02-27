(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("quote-form");
    var statusNode = document.getElementById("form-status");
    if (!form || !statusNode || !window.siteConfig) {
      return;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      clearInvalidFields(form);
      setStatus(statusNode, "", "");

      /** @type {{name: string, phone: string, postcode: string, vehicle: string, issue: string}} */
      var payload = {
        name: getValue(form, "name"),
        phone: getValue(form, "phone"),
        postcode: getValue(form, "postcode"),
        vehicle: getValue(form, "vehicle"),
        issue: getValue(form, "issue")
      };

      var missingFields = [];
      if (!payload.name) missingFields.push("name");
      if (!payload.phone) missingFields.push("phone");
      if (!payload.postcode) missingFields.push("postcode");
      if (!payload.vehicle) missingFields.push("vehicle");
      if (!payload.issue) missingFields.push("issue");

      if (missingFields.length > 0) {
        markInvalidFields(form, missingFields);
        setStatus(statusNode, "Please complete all required fields before sending.", "error");
        focusFirstInvalidField(form, missingFields);
        return;
      }

      if (!isLikelyPhone(payload.phone)) {
        markInvalidFields(form, ["phone"]);
        setStatus(statusNode, "Please enter a valid phone number.", "error");
        form.querySelector('[name="phone"]').focus();
        return;
      }

      var message = buildWhatsAppMessage(payload);
      var targetUrl =
        "https://wa.me/" + window.siteConfig.phoneE164 + "?text=" + encodeURIComponent(message);

      window.open(targetUrl, "_blank", "noopener");
      setStatus(statusNode, "WhatsApp opened. If not, use Call.", "success");
      form.reset();
    });
  });

  function getValue(form, fieldName) {
    var node = form.querySelector('[name="' + fieldName + '"]');
    return node ? node.value.trim() : "";
  }

  function isLikelyPhone(value) {
    return /^[+0-9()\-\s]{7,20}$/.test(value);
  }

  function buildWhatsAppMessage(payload) {
    return [
      "New quote request - SK Motor Services UK",
      "",
      "Name: " + payload.name,
      "Phone: " + payload.phone,
      "Postcode: " + payload.postcode,
      "Vehicle: " + payload.vehicle,
      "Issue: " + payload.issue
    ].join("\n");
  }

  function setStatus(statusNode, message, type) {
    statusNode.textContent = message;
    statusNode.classList.remove("success", "error");
    if (type) {
      statusNode.classList.add(type);
    }
  }

  function clearInvalidFields(form) {
    form.querySelectorAll(".invalid").forEach(function (field) {
      field.classList.remove("invalid");
    });
  }

  function markInvalidFields(form, fieldNames) {
    fieldNames.forEach(function (name) {
      var field = form.querySelector('[name="' + name + '"]');
      if (field) {
        field.classList.add("invalid");
      }
    });
  }

  function focusFirstInvalidField(form, fieldNames) {
    var firstName = fieldNames[0];
    var firstField = form.querySelector('[name="' + firstName + '"]');
    if (firstField) {
      firstField.focus();
    }
  }
})();
