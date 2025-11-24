/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(["N/log", "N/record", "N/search", "./Utils/Validation"], function (
  log,
  record,
  search,
  Validation
) {
  /**
   * Validates required vendor payment fields
   * @param {Object} paymentData - Payment data object
   * @param {Object} context - Request context
   */
  function validatePaymentFields(paymentData, context) {
    const requiredFields = [
      "nsVendorId",
      "date",
      "nsAPAccount",
      "nsAccountId",
      "currency",
    ];
    if (context.action === "UPDATE") {
      requiredFields.push("nsPaymentId");
      if (paymentData.unapplyBills && Array.isArray(paymentData.unapplyBills)) {
        paymentData.unapplyBills.forEach((bill, index) => {
          Validation.validateFields(bill, ["nsBillId"]);
        });
      }
      if (
        paymentData.applyNewBills &&
        Array.isArray(paymentData.applyNewBills)
      ) {
        paymentData.applyNewBills.forEach((bill, index) => {
          Validation.validateFields(bill, ["nsBillId", "amount"]);
        });
      }
    } else if (context.action === "CREATE") {
      requiredFields.push("bills", "subsidiary", "department");
      if (paymentData.bills && Array.isArray(paymentData.bills)) {
        paymentData.bills.forEach((bill, index) => {
          Validation.validateFields(bill, ["nsBillId", "amount"]);
        });
      }
    }
    Validation.validateFields(paymentData, requiredFields);

    if (!Validation.validateVendor(paymentData.nsVendorId)) {
      throw {
        code: "ER-010",
        message: `Vendor with ID ${paymentData.nsVendorId} not found`,
      };
    }

    if (!Validation.validateAccount(paymentData.nsAccountId)) {
      throw {
        code: "ER-011",
        message: `Account with ID ${paymentData.nsAccountId} not found`,
      };
    }

    if (!Validation.validateAccount(paymentData.nsAPAccount)) {
      throw {
        code: "ER-012",
        message: `AP Account with ID ${paymentData.nsAPAccount} not found`,
      };
    }

    if (context.action === "CREATE" && paymentData.bills) {
      for (let i = 0; i < paymentData.bills.length; i++) {
        const bill = paymentData.bills[i];
        if (
          !Validation.validateVendorBill(bill.nsBillId, paymentData.nsVendorId)
        ) {
          throw {
            code: "ER-013",
            message: `Bill with ID ${bill.nsBillId} not found or does not belong to vendor ${paymentData.nsVendorId}`,
          };
        }
      }
    } else if (context.action === "UPDATE") {
      if (paymentData.unapplyBills) {
        for (let i = 0; i < paymentData.unapplyBills.length; i++) {
          const bill = paymentData.unapplyBills[i];
          if (
            !Validation.validateVendorBill(
              bill.nsBillId,
              paymentData.nsVendorId
            )
          ) {
            throw {
              code: "ER-013",
              message: `Bill with ID ${bill.nsBillId} not found or does not belong to vendor ${paymentData.nsVendorId}`,
            };
          }
        }
      }
      if (paymentData.applyNewBills) {
        for (let i = 0; i < paymentData.applyNewBills.length; i++) {
          const bill = paymentData.applyNewBills[i];
          if (
            !Validation.validateVendorBill(
              bill.nsBillId,
              paymentData.nsVendorId
            )
          ) {
            throw {
              code: "ER-013",
              message: `Bill with ID ${bill.nsBillId} not found or does not belong to vendor ${paymentData.nsVendorId}`,
            };
          }
        }
      }
    }

    log.debug(
      "Vendor payment validation passed",
      JSON.stringify({
        nsVendorId: paymentData.nsVendorId,
        billCount: (paymentData.bills || paymentData.applyNewBills || [])
          .length,
      })
    );
  }

  /**
   * Creates or loads a vendor payment record
   * @param {String} action - CREATE or UPDATE
   * @param {String} nsPaymentId - NetSuite payment ID (for updates)
   * @returns {Object} - NetSuite record object
   */
  function createOrLoadPaymentRecord(action, nsPaymentId, nsVendorId) {
    if (action === "UPDATE") {
      return record.load({
        type: record.Type.VENDOR_PAYMENT,
        id: nsPaymentId,
        isDynamic: true,
      });
    }
    return record.create({
      type: record.Type.VENDOR_PAYMENT,
      isDynamic: true,
      defaultValues: {
        entity: nsVendorId,
      },
    });
  }

  /**
   * Formats date string to JavaScript Date object
   * @param {String} dateString - Date string in DD/MM/YYYY format
   * @returns {Date} - JavaScript Date object
   */
  function formatDate(dateString) {
    if (!dateString) return null;

    try {
      const parts = dateString.split("/");
      if (parts.length !== 3) {
        log.error("Invalid date format", dateString);
        return null;
      }
      return new Date(parts[2], parts[1] - 1, parts[0]);
    } catch (e) {
      log.error("Error formatting date", e);
      return null;
    }
  }

  /**
   * Sets base header fields on payment record
   * @param {Object} rec - NetSuite record object
   * @param {Object} paymentData - Payment data object
   * @param {String} action - CREATE or UPDATE
   * @returns {Object} - Updated NetSuite record
   */
  function setHeaderFields(rec, paymentData, action) {
    const paymentDate = formatDate(paymentData.date);
    if (paymentDate) {
      rec.setValue("trandate", paymentDate);
    }

    if (action === "CREATE") {
      rec.setValue("subsidiary", paymentData.subsidiary);
      rec.setValue("department", paymentData.department);
      rec.setValue("class", paymentData.class);
      rec.setValue("account", paymentData.nsAccountId);
      if(paymentData.isNonACMEPayment) {
        rec.setValue("custbody_non_acme_payment", true);
      }
    }

    rec.setValue("apacct", paymentData.nsAPAccount);

    if (paymentData.memo) {
      rec.setValue("memo", paymentData.memo);
    }

    const currencyMap = {
      MYR: 1,
      USD: 2,
      SGD: 6,
      IDR: 7,
    };

    const currencyId = currencyMap[paymentData.currency] || 1;
    rec.setValue("currency", currencyId);
    return rec;
  }

  /**
   * Unapplies existing bills from payment
   * @param {Object} rec - NetSuite record object
   * @param {Array} unapplyBills - Array of bill data objects to unapply
   * @returns {Object} - Updated NetSuite record
   */
  function unapplyBills(rec, unapplyBills) {
    if (!unapplyBills || !Array.isArray(unapplyBills)) return rec;

    const lineCount = rec.getLineCount({ sublistId: "apply" });
    let unappliedCount = 0;

    for (let i = 0; i < lineCount; i++) {
      rec.selectLine({ sublistId: "apply", line: i });
      const lineBillId = rec.getCurrentSublistValue({
        sublistId: "apply",
        fieldId: "internalid",
      });
      const isApplied = rec.getCurrentSublistValue({
        sublistId: "apply",
        fieldId: "apply",
      });

      const match = unapplyBills.find(
        (bill) => String(bill.nsBillId) === String(lineBillId)
      );
      if (match && isApplied) {
        rec.setCurrentSublistValue({
          sublistId: "apply",
          fieldId: "apply",
          value: false,
        });
        rec.setCurrentSublistValue({
          sublistId: "apply",
          fieldId: "amount",
          value: 0,
        });
        rec.commitLine({ sublistId: "apply" });
        log.debug(`Unapplied bill`, { nsBillId: lineBillId });
        unappliedCount++;
      } else if (match && !isApplied) {
        log.debug(`Bill already unapplied`, { nsBillId: lineBillId });
      }
    }

    if (unappliedCount < unapplyBills.length) {
      log.warn(`Some bills not found or already unapplied`, {
        requested: unapplyBills.length,
        unapplied: unappliedCount,
      });
    }

    return rec;
  }

  /**
   * Applies payment to bills
   * @param {Object} rec - NetSuite record object
   * @param {Array} bills - Array of bill data objects
   * @returns {Object} - Updated NetSuite record
   */
  function applyToBills(rec, bills) {
    log.debug("applyToBills - Bills to apply", JSON.stringify(rec));
    if (!bills || !Array.isArray(bills)) return rec;

    bills.forEach((bill, index) => {
      try {
        const lineCount = rec.getLineCount({ sublistId: "apply" });
        log.debug("Line count in apply sublist", lineCount);
        let lineFound = false;

        for (let i = 0; i < lineCount; i++) {
          rec.selectLine({ sublistId: "apply", line: i });
          const lineBillId = rec.getCurrentSublistValue({
            sublistId: "apply",
            fieldId: "internalid",
          });
          log.debug(`Checking bill line ${i}`, { nsBillId: lineBillId });
          if (String(lineBillId) == String(bill.nsBillId)) {
            lineFound = true;
            rec.setCurrentSublistValue({
              sublistId: "apply",
              fieldId: "apply",
              value: true,
            });
            rec.setCurrentSublistValue({
              sublistId: "apply",
              fieldId: "amount",
              value: Number(bill.amount),
            });
            rec.commitLine({ sublistId: "apply" });
            log.debug(`Payment applied to bill ${index}`, {
              nsBillId: bill.nsBillId,
              amount: bill.amount,
            });
            break;
          }
        }

        if (!lineFound) {
          log.error(
            `Bill not found`,
            `Bill ID ${bill.nsBillId} not found in the apply sublist`
          );
          throw {
            code: "ER-003",
            message: `Bill ID ${bill.nsBillId} not found`,
          };
        }
      } catch (e) {
        log.error(
          `Error applying payment to bill ${index}`,
          e.name + ": " + e.message
        );
        log.error("Error details", e);
        throw e;
      }
    });

    return rec;
  }

  /**
   * Saves the payment record
   * @param {Object} rec - NetSuite record object
   * @returns {String} - Record ID
   */
  function savePaymentRecord(rec) {
    return rec.save({
      enableSourcing: true,
      ignoreMandatoryFields: true,
    });
  }

  /**
   * Creates success response object
   * @param {String} action - CREATE or UPDATE
   * @param {String} id - NetSuite record ID
   * @returns {Object} - Success response
   */
  function createSuccessResponse(action, id) {
    return {
      status: "success",
      message: `Vendor Payment ${action.toLowerCase()}d successfully`,
      nsPaymentId: id,
    };
  }

  /**
   * Creates error response object
   * @param {Object} error - Error object
   * @returns {Object} - Error response
   */
  function createErrorResponse(error) {
    return {
      status: "error",
      code: error.code || "ER-000",
      message: error.message,
    };
  }

  /**
   * Main handler function for vendor payment requests
   * @param {Object} context - Request context
   * @returns {Object} - Response object
   */
  function handleRequest(context) {
    try {
      log.debug("handleRequest - Vendor Payment", JSON.stringify(context));
      validatePaymentFields(context.data, context);

      log.debug(`Processing ${context.action} vendor payment record`);
      const rec = createOrLoadPaymentRecord(
        context.action,
        context.data.nsPaymentId,
        context.data.nsVendorId
      );

      log.debug("Setting header fields");
      setHeaderFields(rec, context.data, context.action);

      if (context.action === "CREATE" && context.data.bills) {
        log.debug("Applying payment to bills");
        applyToBills(rec, context.data.bills);

        const accountAfterApply = rec.getValue("account");

        // Re-set account field if it was changed by NetSuite sourcing
        if (accountAfterApply != context.data.nsAccountId) {
          rec.setValue("account", Number(context.data.nsAccountId));
        }
      } else if (context.action === "UPDATE") {
        if (context.data.unapplyBills) {
          log.debug("Unapplying bills");
          unapplyBills(rec, context.data.unapplyBills);
        }
        if (context.data.applyNewBills) {
          log.debug("Applying new bills");
          applyToBills(rec, context.data.applyNewBills);
        }
      }

      log.debug("Saving vendor payment record");
      const id = savePaymentRecord(rec);
      log.debug("Vendor payment saved with ID", id);

      return createSuccessResponse(context.action, id);
    } catch (e) {
      log.error("Error in VendorPaymentService", e.name + ": " + e.message);
      log.error("Error details", e);
      return createErrorResponse(e);
    }
  }

  return { handleRequest };
});