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
   * Validates required vendor fields
   * @param {Object} vendorData - Vendor data object
   */
  function validateVendorFields(vendorData, context) {
    Validation.validateFields(vendorData, ["vendorId", "type"]);

    if (context.action === "CREATE") {
      Validation.validateFields(vendorData, ["subsidiary"]);
    }

    if (vendorData.type && vendorData.type.toLowerCase() === "company") {
      Validation.validateFields(vendorData, ["companyName"]);
    } else {
      Validation.validateFields(vendorData, ["name"]);
    }

    if (vendorData.address) {
      Validation.validateFields(vendorData.address, [
        "address",
        "city",
        "state",
        "country",
        "zip",
      ]);
      log.debug(
        "Address validation passed",
        JSON.stringify(vendorData.address)
      );
    } else {
      log.debug("No address information provided");
    }
  }

  /**
   * Creates or loads a vendor record based on action
   * @param {String} action - CREATE or UPDATE
   * @param {String} nsVendorId - NetSuite vendor ID (for updates)
   * @returns {Object} - NetSuite record object
   */
  function createOrLoadRecord(action, nsVendorId) {
    if (action === "CREATE") {
      return record.create({
        type: record.Type.VENDOR,
        isDynamic: true,
      });
    } else {
      return record.load({
        type: record.Type.VENDOR,
        id: nsVendorId,
        isDynamic: true,
      });
    }
  }

  /**
   * Sets base fields on vendor record
   * @param {Object} rec - NetSuite record object
   * @param {Object} vendorData - Vendor data object
   * @returns {Object} - Updated NetSuite record
   */
  function setBaseFields(rec, vendorData) {
    if (vendorData.type && vendorData.type.toLowerCase() === "individual") {
      rec.setValue("isperson", "T");

      if (vendorData.name && vendorData.name.includes(" ")) {
        const nameParts = vendorData.name.split(" ");
        rec.setValue("firstname", nameParts[0]);
        rec.setValue("lastname", nameParts.slice(1).join(" "));
      } else {
        rec.setValue("firstname", vendorData.name || "");
        rec.setValue("lastname", vendorData.companyName || "");
      }
    } else {
      rec.setValue("isperson", "F");
      rec.setValue("companyname", vendorData.companyName);
    }

    rec.setValue("custentity_ps_hms_vendor_id", vendorData.vendorId);

    rec.setValue("email", vendorData.email);
    rec.setValue("phone", vendorData.phone);

    if (vendorData.panelCode) {
      rec.setValue("custentity_ps_panelcode", vendorData.panelCode);
    }
    if (vendorData.corporateCode) {
      rec.setValue("custentity_ps_corporatecode", vendorData.corporateCode);
    }

    if (vendorData.subsidiary) {
      rec.setValue("subsidiary", vendorData.subsidiary);
    }

    if (vendorData.category) {
      rec.setValue("category", vendorData.category);
    }
    return rec;
  }

  /**
   * Sets address fields on vendor record
   * @param {Object} rec - NetSuite record object
   * @param {Object} address - Address data object
   * @returns {Object} - Updated NetSuite record
   */
  function setAddressFields(rec, address) {
    if (!address) return rec;

    try {
      // rec.selectNewLine({
      //   sublistId: "addressbook",
      // });
      // const addressSubrecord = rec.getCurrentSublistSubrecord({
      //   sublistId: "addressbook",
      //   fieldId: "addressbookaddress",
      // });

      // addressSubrecord.setValue({
      //   fieldId: "addr1",
      //   value: address.address,
      // });

      // addressSubrecord.setValue({
      //   fieldId: "city",
      //   value: address.city,
      // });

      // if (address.state) {
      //   addressSubrecord.setValue({
      //     fieldId: "state",
      //     value: address.state,
      //   });
      // }

      // addressSubrecord.setValue({
      //   fieldId: "country",
      //   value: address.country,
      // });

      // if (address.zip) {
      //   addressSubrecord.setValue({
      //     fieldId: "zip",
      //     value: address.zip,
      //   });
      // }

      // rec.setCurrentSublistValue({
      //   sublistId: "addressbook",
      //   fieldId: "label",
      //   value: "Primary Address",
      // });
      // rec.setCurrentSublistValue({
      //   sublistId: "addressbook",
      //   fieldId: "isresidential",
      //   value: false,
      // });

      // rec.commitLine({
      //   sublistId: "addressbook",
      // });

      // Loop through addressbook sublist lines
      const lineCount = rec.getLineCount({ sublistId: "addressbook" });

      for (let i = 0; i < lineCount; i++) {
        const label = rec.getSublistValue({
          sublistId: "addressbook",
          fieldId: "defaultbilling",
          line: i,
        });
        log.debug({
          title: 'label',
          details: label
        });

        // Find the line you want to update
        if (label === "T" || label === "true" || label == true) {
          // Select the line
          rec.selectLine({
            sublistId: "addressbook",
            line: i,
          });

          // Get the subrecord for the address
          const addressSubrecord = rec.getCurrentSublistSubrecord({
            sublistId: "addressbook",
            fieldId: "addressbookaddress",
          });

          // Update address fields dynamically
          addressSubrecord.setValue({
            fieldId: "addr1",
            value: address.address,
          });
          addressSubrecord.setValue({
            fieldId: "city",
            value: address.city,
          });
          if (address.state) {
            addressSubrecord.setValue({
              fieldId: "state",
              value: address.state,
            });
          }
          addressSubrecord.setValue({
            fieldId: "country",
            value: address.country,
          });
          if (address.zip) {
            addressSubrecord.setValue({
              fieldId: "zip",
              value: address.zip,
            });
          }

          // You can also update label or other fields if needed
          rec.setCurrentSublistValue({
            sublistId: "addressbook",
            fieldId: "isresidential",
            value: false,
          });

          // Commit the updated line
          rec.commitLine({
            sublistId: "addressbook",
          });

        }
      }

      log.debug("Address set successfully", JSON.stringify(address));
    } catch (e) {
      log.error("Error setting address fields", e.name + ": " + e.message);
      log.error("Error details", e);
    }

    return rec;
  }

  /**
   * Sets customer relationship if isCustomerAlso is true
   * @param {String} vendorId - NetSuite vendor ID
   * @returns {Object} - Updated NetSuite record
   */
  function setCustomerRelationship(vendorId, context) {
    var title = 'setCustomerRelationship[::]';
    try {

      if (context.action === "CREATE") {

        const customerRec = record.transform({
          fromType: record.Type.VENDOR,
          fromId: vendorId,
          toType: record.Type.CUSTOMER,
          isDynamic: true,
        });
        const customerId = customerRec.save({
          enableSourcing: true,
          ignoreMandatoryFields: true,
        });
        log.debug("Customer relationship set successfully", {
          customerId,
          vendorId,
        });

      }
      return vendorId;
    } catch (e) {
      log.error(title + e.name, e.message);
    }
  }

  /**
   * Saves the vendor record
   * @param {Object} rec - NetSuite record object
   * @returns {String} - Record ID
   */
  function saveVendorRecord(rec) {
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
  function createSuccessResponse(action, id, customerId, bankDetailsInfo) {
    const response = {
      status: "success",
      message: `Vendor ${action.toLowerCase()}d successfully`,
      nsVendorId: id,
    };
    if (customerId) {
      response.customerId = customerId;
    }
    if (bankDetailsInfo) {
      response.bankDetails = {
        processed: bankDetailsInfo.processed,
        count: bankDetailsInfo.count,
        records: bankDetailsInfo.bankDetailRecords,
        message: `${bankDetailsInfo.count} bank detail${bankDetailsInfo.count !== 1 ? "s" : ""
          } processed successfully`,
      };
    }
    log.debug("Vendor saved successfully", { vendorId, customerId });
    return createSuccessResponse(
      context.action,
      vendorId,
      customerId,
      bankDetailsInfo
    );
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
   * Main handler function for vendor requests
   * @param {Object} context - Request context
   * @returns {Object} - Response object
   */
  function handleRequest(context) {
    try {
      log.debug("handleRequest - Vendor", JSON.stringify(context));
      validateVendorFields(context.data, context);

      const rec = createOrLoadRecord(context.action, context.data.nsVendorId);

      setBaseFields(rec, context.data);

      if (context.data.address) {
        setAddressFields(rec, context.data.address);
      }

      const vendorId = saveVendorRecord(rec);
      let customerId = null;
      if (context.data.isCustomerAlso) {
        customerId = setCustomerRelationship(vendorId, context);
      }

      // Process bank details if provided
      let bankDetailsInfo = null;
      if (
        context.data.bank_details &&
        Array.isArray(context.data.bank_details)
      ) {
        const result = processBankDetails(context.data.bank_details, vendorId);

        if (!result.success) {
          log.error(
            "Bank details processing failed, deleting created vendor and customer",
            {
              vendorId,
              customerId,
            }
          );

          // Delete the customer record if it was created
          if (customerId) {
            try {
              record.delete({
                type: record.Type.CUSTOMER,
                id: customerId,
              });
              log.debug("Customer record deleted", { customerId });
            } catch (deleteError) {
              log.error("Failed to delete customer record", {
                customerId,
                error: deleteError.message,
              });
            }
          }

          // Delete the vendor record
          try {
            record.delete({
              type: record.Type.VENDOR,
              id: vendorId,
            });
            log.debug("Vendor record deleted", { vendorId });
          } catch (deleteError) {
            log.error("Failed to delete vendor record", {
              vendorId,
              error: deleteError.message,
            });
          }

          return createErrorResponse(result.error);
        } else {
          // Capture bank details information for success response
          bankDetailsInfo = {
            count: context.data.bank_details.length,
            bankDetailRecords: result.bankDetailRecords || [],
            processed: true,
          };
        }
      }

      log.debug("Vendor saved successfully", { vendorId, customerId });
      return createSuccessResponse(
        context.action,
        vendorId,
        customerId,
        bankDetailsInfo
      );
    } catch (e) {
      log.error("Error in VendorService", e.name + ": " + e.message);
      log.error("Error details", e);
      return createErrorResponse(e);
    }
  }

  /**
   * Creates or updates bank detail records
   * @param {Array} bankDetails - Array of bank detail objects
   * @param {String} vendorId - NetSuite vendor ID
   */
  function processBankDetails(bankDetails, vendorId) {
    const bankDetailRecords = [];
    try {
      log.debug("Processing bank details", {
        count: bankDetails.length,
        vendorId,
      });

      for (let i = 0; i < bankDetails.length; i++) {
        const bankDetail = bankDetails[i];
        log.debug("Processing bank detail", { index: i, bankDetail });

        // Validate required fields
        if (!bankDetail.paymenTypeForm) {
          throw {
            code: "MISSING_REQUIRED_FIELD",
            message: `Bank detail at index ${i} is missing required field: paymenTypeForm`,
          };
        }

        // Determine if we need to create or update
        let bankRec;
        if (!bankDetail.internalid) {
          // Create new record
          bankRec = record.create({
            type: "customrecord_ps_bank_detail_record",
            isDynamic: true,
          });
          log.debug("Creating new bank detail record");
        } else {
          // Update existing record
          bankRec = record.load({
            type: "customrecord_ps_bank_detail_record",
            id: bankDetail.internalid,
            isDynamic: true,
          });
          log.debug("Updating existing bank detail record", {
            id: bankDetail.internalid,
          });
        }

        // Set fields based on mapping
        if (bankDetail.paymenTypeForm)
          bankRec.setValue("customform", bankDetail.paymenTypeForm);
        if (bankDetail.nickname) bankRec.setValue("name", bankDetail.nickname);
        if (bankDetail.primaryBank !== undefined)
          bankRec.setValue(
            "custrecord_ps_primary_bank",
            bankDetail.primaryBank
          );
        if (bankDetail.type)
          bankRec.setValue("custrecord_payment_type", bankDetail.type);
        if (bankDetail.payeeName)
          bankRec.setValue(
            "custrecord_ps_bdr_payee_name",
            bankDetail.payeeName
          );
        if (bankDetail.vendorBillCurrency)
          bankRec.setValue(
            "custrecordps_vendor_bill_currency",
            bankDetail.vendorBillCurrency
          );

        bankRec.setValue("custrecord_ps_vendor_name", vendorId);

        if (bankDetail.recBankName)
          bankRec.setValue(
            "custrecord_ps_rec_bank_name",
            bankDetail.recBankName
          );
        if (bankDetail.bankAccNumber)
          bankRec.setValue(
            "custrecord_ps_bank_acc_number",
            bankDetail.bankAccNumber
          );
        if (bankDetail.bankAccountSwift)
          bankRec.setValue(
            "custrecord_ps_bank_account",
            bankDetail.bankAccountSwift
          );
        if (bankDetail.vsubpaymentType)
          bankRec.setValue(
            "custrecord_ps_sub_payment_type",
            bankDetail.vsubpaymentType
          );
        if (bankDetail.residencyStatus)
          bankRec.setValue(
            "custrecord_ps_receiver_residencystatus",
            bankDetail.residencyStatus
          );
        if (bankDetail.beneficiaryType)
          bankRec.setValue(
            "custrecord_ps_receiver_beneficiarytype",
            bankDetail.beneficiaryType
          );
        if (bankDetail.citizenshipStatus)
          bankRec.setValue(
            "custrecord_ps_receiver_citizenshipstatus",
            bankDetail.citizenshipStatus
          );
        if (bankDetail.paynowMethod)
          bankRec.setValue(
            "custrecord_ps_paynow_method",
            bankDetail.paynowMethod
          );
        if (bankDetail.paynowNumber)
          bankRec.setValue("custrecord_ps_value", bankDetail.paynowNumber);
        if (bankDetail.localRoutingIdentifier)
          bankRec.setValue(
            "custrecord_ps_local_routing_identifier",
            bankDetail.localRoutingIdentifier
          );
        if (bankDetail.intermediaryBank)
          bankRec.setValue(
            "custrecord_ps_intermediary_bank",
            bankDetail.intermediaryBank
          );
        if (bankDetail.addressLine1)
          bankRec.setValue(
            "custrecord_ps_address_line1",
            bankDetail.addressLine1
          );
        if (bankDetail.addressLine2)
          bankRec.setValue(
            "custrecord_ps_address_line2",
            bankDetail.addressLine2
          );
        if (bankDetail.addressCity)
          bankRec.setValue(
            "custrecord_ps_address_city",
            bankDetail.addressCity
          );
        if (bankDetail.addressState)
          bankRec.setValue(
            "custrecord_ps_address_state",
            bankDetail.addressState
          );
        if (bankDetail.addressPostalCode)
          bankRec.setValue(
            "custrecord_ps_address_postal_code",
            bankDetail.addressPostalCode
          );
        if (bankDetail.addressCountry)
          bankRec.setValue(
            "custrecord_ps_address_country",
            bankDetail.addressCountry
          );
        if (bankDetail.nextapprover)
          bankRec.setValue(
            "custrecord_ps_bdr_next_approver",
            bankDetail.nextapprover
          );
        if (bankDetail.approvalStatus)
          bankRec.setValue(
            "custrecord_ps_bdr_approval_status",
            bankDetail.approvalStatus
          );
        if (bankDetail.approved !== undefined)
          bankRec.setValue("custrecord_ps_bdr_approved", bankDetail.approved);
        if (bankDetail.receiverType)
          bankRec.setValue(
            "custrecord_ps_my_receiver_type",
            bankDetail.receiverType
          );
        if (bankDetail.passportNo)
          bankRec.setValue(
            "custrecord_ps_my_passport_number",
            bankDetail.passportNo
          );
        if (bankDetail.receiverTypeNum)
          bankRec.setValue(
            "custrecord_ps_my_receiver_type_number",
            bankDetail.receiverTypeNum
          );

        // Save the record
        const bankDetailId = bankRec.save({
          enableSourcing: true,
          ignoreMandatoryFields: false,
        });

        // Capture both ID and nickname for the response
        const bankDetailRecord = {
          internalId: bankDetailId,
          nickname: bankDetail.nickname || `Bank Detail ${i + 1}`,
        };
        bankDetailRecords.push(bankDetailRecord);
        log.debug("Bank detail record saved", {
          bankDetailId,
          nickname: bankDetailRecord.nickname,
        });
      }

      log.debug("Finished processing all bank details", { bankDetailRecords });
    } catch (e) {
      log.error("Error processing bank details", e.name + ": " + e.message);
      log.error("Error details", e);
      return {
        success: false,
        error: e,
      };
    }

    return {
      success: true,
      bankDetailRecords: bankDetailRecords,
    };
  }

  return { handleRequest };
});
