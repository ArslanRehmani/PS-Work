/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define([
  "N/log",
  "N/record",
  "N/search",
  "./Utils/Validation",
  "./Utils/Constants",
], function (log, record, search, Validation, CONSTANTS) {
  /**
   * Validates required vendor credit fields
   * @param {Object} creditData - Vendor credit data object
   * @param {Object} context - Request context
   */
  function validateCreditFields(creditData, context) {
    const requiredFields = ["nsVendorId", "date", "currency"];
    if (context.action === "UPDATE") {
      requiredFields.push("nsVendorCreditId");
      if (creditData.unapplyBills && Array.isArray(creditData.unapplyBills)) {
        creditData.unapplyBills.forEach((bill, index) => {
          Validation.validateFields(bill, ["nsBillId"]);
        });
      }
      if (creditData.applyNewBills && Array.isArray(creditData.applyNewBills)) {
        creditData.applyNewBills.forEach((bill, index) => {
          Validation.validateFields(bill, ["nsBillId", "amount"]);
        });
      }
    } else if (context.action === "CREATE") {
      requiredFields.push("subsidiary", "department", "class", "items");
      if (creditData.items && Array.isArray(creditData.items)) {
        creditData.items.forEach((item, index) => {
          Validation.validateFields(item, [
            "nsItemId",
            "quantity",
            "rate",
            "amount",
          ]);
        });
      }
      if (creditData.bills && Array.isArray(creditData.bills)) {
        creditData.bills.forEach((bill, index) => {
          Validation.validateFields(bill, ["nsBillId", "amount"]);
        });
      }
    }
    Validation.validateFields(creditData, requiredFields);

    if (!Validation.validateVendor(creditData.nsVendorId)) {
      throw {
        code: "ER-010",
        message: `Vendor with ID ${creditData.nsVendorId} not found`,
      };
    }

    if (!Validation.validateAccount(creditData.nsAccountId)) {
      throw {
        code: "ER-011",
        message: `Account with ID ${creditData.nsAccountId} not found`,
      };
    }

    if (context.action === "CREATE" && creditData.items) {
      for (let i = 0; i < creditData.items.length; i++) {
        const item = creditData.items[i];
        if (!Validation.validateItem(item.nsItemId)) {
          throw {
            code: "ER-015",
            message: `Item with ID ${item.nsItemId} not found`,
          };
        }
      }
    }
    if (context.action === "CREATE" && creditData.bills) {
      for (let i = 0; i < creditData.bills.length; i++) {
        const bill = creditData.bills[i];
        if (
          !Validation.validateVendorBill(bill.nsBillId, creditData.nsVendorId)
        ) {
          throw {
            code: "ER-014",
            message: `Bill with ID ${bill.nsBillId} not found or does not belong to vendor ${creditData.nsVendorId}`,
          };
        }
      }
    } else if (context.action === "UPDATE") {
      if (creditData.unapplyBills) {
        for (let i = 0; i < creditData.unapplyBills.length; i++) {
          const bill = creditData.unapplyBills[i];
          if (
            !Validation.validateVendorBill(bill.nsBillId, creditData.nsVendorId)
          ) {
            throw {
              code: "ER-014",
              message: `Bill with ID ${bill.nsBillId} not found or does not belong to vendor ${creditData.nsVendorId}`,
            };
          }
        }
      }
      if (creditData.applyNewBills) {
        for (let i = 0; i < creditData.applyNewBills.length; i++) {
          const bill = creditData.applyNewBills[i];
          if (
            !Validation.validateVendorBill(bill.nsBillId, creditData.nsVendorId)
          ) {
            throw {
              code: "ER-014",
              message: `Bill with ID ${bill.nsBillId} not found or does not belong to vendor ${creditData.nsVendorId}`,
            };
          }
        }
      }
    }

    log.debug(
      "Vendor credit validation passed",
      JSON.stringify({
        nsVendorId: creditData.nsVendorId,
        itemCount: (creditData.items || []).length,
        billCount: (creditData.bills || creditData.applyNewBills || []).length,
      })
    );
  }

  /**
   * Creates or loads a vendor credit record
   * @param {String} action - CREATE or UPDATE
   * @param {String} nsVendorCreditId - NetSuite vendor credit ID (for updates)
   * @returns {Object} - NetSuite record object
   */
  function createOrLoadCreditRecord(action, nsVendorCreditId) {
    if (action === "UPDATE") {
      return record.load({
        type: record.Type.VENDOR_CREDIT,
        id: nsVendorCreditId,
        isDynamic: true,
      });
    }
    return record.create({
      type: record.Type.VENDOR_CREDIT,
      isDynamic: true,
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
   * Sets base header fields on vendor credit record
   * @param {Object} rec - NetSuite record object
   * @param {Object} creditData - Vendor credit data object
   * @param {String} action - CREATE or UPDATE
   * @returns {Object} - Updated NetSuite record
   */
  function setHeaderFields(rec, creditData, action) {
    rec.setValue("customform", CONSTANTS.CUSTOM_FORMS.TRADE_VENDOR_CREDIT);

    rec.setValue("entity", creditData.nsVendorId);

    const creditDate = formatDate(creditData.date);
    if (creditDate) {
      rec.setValue("trandate", creditDate);
    }

    if (action === "CREATE") {
        rec.setValue("subsidiary", creditData.subsidiary);
        rec.setValue("department", creditData.department);
        rec.setValue("class", creditData.class);
        rec.setValue("account", creditData.nsAccountId);
        if (creditData.referenceNumber) rec.setValue('tranid', creditData.referenceNumber);
        if (creditData.referenceNumber) rec.setValue('otherrefnum', creditData.referenceNumber);
    }

    if (creditData.memo) {
      rec.setValue("memo", creditData.memo);
    }

    return rec;
  }

  /**
   * Adds items to vendor credit record
   * @param {Object} rec - NetSuite record object
   * @param {Array} items - Array of item data objects
   * @returns {Object} - Updated NetSuite record
   */
  function addItems(rec, items) {
    if (!items || !Array.isArray(items)) return rec;

    items.forEach((item, index) => {
      try {
        rec.selectNewLine({
          sublistId: "item",
        });

        rec.setCurrentSublistValue({
          sublistId: "item",
          fieldId: "item",
          value: item.nsItemId,
        });

        rec.setCurrentSublistValue({
          sublistId: "item",
          fieldId: "quantity",
          value: item.quantity,
        });

        rec.setCurrentSublistValue({
          sublistId: "item",
          fieldId: "rate",
          value: item.rate,
        });

        if (item.amount) {
            rec.setCurrentSublistValue({
                sublistId: "item",
                fieldId: "amount",
                value: item.amount,
            });
        }

        if (item.taxCode) {
            rec.setCurrentSublistValue({
                sublistId: "item",
                fieldId: "taxcode",
                value: item.taxCode,
            });
        }

        if (item.taxAmount) {
            rec.setCurrentSublistValue({
                sublistId: "item",
                fieldId: "tax1amt",
                value: item.taxAmount,
            });
        }

        rec.commitLine({
            sublistId: "item",
        });

        log.debug(
          `Added item ${index}`,
          JSON.stringify({
            nsItemId: item.nsItemId,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
          })
        );
      } catch (e) {
        log.error(`Error adding item ${index}`, e.name + ": " + e.message);
        log.error("Error details", e);
        throw { code: "ER-004", message: `Error adding item: ${e.message}` };
      }
    });

    return rec;
  }

  /**
   * Unapplies existing bills from vendor credit
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
    if (!bills || !Array.isArray(bills)) return rec;

    bills.forEach((bill, index) => {
      try {
        const lineCount = rec.getLineCount({ sublistId: "apply" });
        let lineFound = false;

        for (let i = 0; i < lineCount; i++) {
          rec.selectLine({ sublistId: "apply", line: i });
          const lineBillId = rec.getCurrentSublistValue({
            sublistId: "apply",
            fieldId: "internalid",
          });
          if (String(lineBillId) === String(bill.nsBillId)) {
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
   * Saves the vendor credit record
   * @param {Object} rec - NetSuite record object
   * @returns {String} - Record ID
   */
  function saveCreditRecord(rec) {
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
      message: `Vendor Credit ${action.toLowerCase()}d successfully`,
      nsVendorCreditId: id,
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
    * Checks if a credit memo with the given referenceNumber already exists
    * @param {String} referenceNumber - Reference number to check
    * @returns {Boolean} - True if duplicate exists, false otherwise
    */
    function checkDuplicateReferenceNumber(referenceNumber) {
        try {
            const searchResult = search.create({
                type: search.Type.VENDOR_CREDIT,
                filters: [
                    ["type","anyof","VendCred"], 
                    "AND", 
                    [
                        ["numbertext","is", referenceNumber],
                        "OR",
                        ["otherrefnum","equalto", referenceNumber]
                    ], 
                    "AND", 
                    ["mainline","is","T"]
                ],
                columns: ['internalid', 'otherrefnum']
            }).run().getRange({ start: 0, end: 1 });

            return searchResult.length > 0;
        } catch (e) {
            log.error('Error checking duplicate reference number', { message: e.message, stack: e.stack, referenceNumber: referenceNumber });
            throw e;
        }
    }

  /**
   * Main handler function for vendor credit requests
   * @param {Object} context - Request context
   * @returns {Object} - Response object
   */
  function handleRequest(context) {
    try {
        log.debug("handleRequest - Vendor Credit", JSON.stringify(context));
        validateCreditFields(context.data, context);
        if (context.action === 'CREATE' && context.data.referenceNumber) {
            if (checkDuplicateReferenceNumber(context.data.referenceNumber)) {
                throw { code: 'ER-018', message: `Reference number ${context.data.referenceNumber} already exists` };
            }
        }

      log.debug(`Processing ${context.action} vendor credit record`);
      const rec = createOrLoadCreditRecord(
        context.action,
        context.data.nsVendorCreditId
      );

      log.debug("Setting header fields");
      setHeaderFields(rec, context.data, context.action);

      if (context.action === "CREATE") {
        if (context.data.items) {
          log.debug("Adding items");
          addItems(rec, context.data.items);
        }
        if (context.data.bills) {
          log.debug("Applying payment to bills");
          applyToBills(rec, context.data.bills);
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

      log.debug("Saving vendor credit record");
      const id = saveCreditRecord(rec);
      log.debug("Vendor credit saved with ID", id);

      return createSuccessResponse(context.action, id);
    } catch (e) {
      log.error("Error in VendorCreditService", e.name + ": " + e.message);
      log.error("Error details", e);
      return createErrorResponse(e);
    }
  }

  return { handleRequest };
});