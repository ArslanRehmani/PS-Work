/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(["N/log", "N/record"], function (log, record) {
  /**
   * Function definition to be triggered before record is loaded.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @param {Form} scriptContext.form - Current form
   * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
   * @since 2015.2
   */
  function beforeLoad(scriptContext) {}

  /**
   * Function definition to be triggered before record is submitted.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {Record} scriptContext.oldRecord - Old record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @since 2015.2
   */
  function beforeSubmit(scriptContext) {}

  /**
   * Function definition to be triggered after record is submitted.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {Record} scriptContext.oldRecord - Old record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @since 2015.2
   */
  function afterSubmit(scriptContext) {
    try {
      const newRecord = scriptContext.newRecord;
      const recordType = newRecord.type;
      const recordId = newRecord.id;

      log.debug("afterSubmit triggered", {
        recordType: recordType,
        recordId: recordId,
        type: scriptContext.type,
      });

      const shadowBankDetail = newRecord.getValue(
        "custbody_ps_bank_detail_shadow"
      );
      const currentBankDetail = newRecord.getValue("custbody_ps_bank_detail");

      log.debug("Bank detail values", {
        shadowValue: shadowBankDetail,
        currentValue: currentBankDetail,
      });

      if (shadowBankDetail && shadowBankDetail !== currentBankDetail) {
        log.debug("Copying bank detail from shadow field", {
          from: shadowBankDetail,
          to: "custbody_ps_bank_detail",
          recordId: recordId,
        });

        const billRecord = record.load({
          type: record.Type.VENDOR_BILL,
          id: recordId,
          isDynamic: false,
        });

        billRecord.setValue("custbody_ps_bank_detail", shadowBankDetail);

        billRecord.setValue("custbody_ps_bank_detail_shadow", "");

        const savedId = billRecord.save({
          enableSourcing: false,
          ignoreMandatoryFields: true,
        });

        log.debug("Bank detail copied successfully", {
          recordId: savedId,
          bankDetailId: shadowBankDetail,
        });
      } else {
        log.debug("No action needed", {
          reason: shadowBankDetail
            ? "Values are the same"
            : "No shadow value to copy",
        });
      }
    } catch (e) {
      log.error("Error in afterSubmit", {
        error: e.name + ": " + e.message,
        details: e,
      });
    }
  }

  return {
    beforeLoad: beforeLoad,
    beforeSubmit: beforeSubmit,
    afterSubmit: afterSubmit,
  };
});
