/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(["N/currentRecord", "N/ui/message", "N/url"], function (currentRecord, message, url) {
  /**
   * Function to be executed after page is initialized.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
   *
   * @since 2015.2
   */
  function pageInit(scriptContext) {
    console.log("pageInit");

    currentPageURL = window.location.href;

    var url = new URL(currentPageURL);
    if (url.searchParams.has("success")) {
      console.log("here ");

      var success = url.searchParams.get("success");

      console.log("here ");

      console.log("success " + success);

      if (success == "true") {
        myMsg = message.create({
          title: "Revenue Posting Initiated",
          message: "Revenue will be posted in few minutes...",
          type: message.Type.CONFIRMATION,
        });
        myMsg.show();
      }

      if (success == "false") {
        myMsg = message.create({
          title: "Revenue Posting Failed",
          message: "Revenue posting failed",
          type: message.Type.ERROR,
        });
        myMsg.show();
      }
    }
  }

  /**
   * Function to be executed when field is changed.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   * @param {string} scriptContext.fieldId - Field name
   * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
   * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
   *
   * @since 2015.2
   */
  function fieldChanged(scriptContext) { }

  /**
   * Function to be executed when field is slaved.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   * @param {string} scriptContext.fieldId - Field name
   *
   * @since 2015.2
   */
  function postSourcing(scriptContext) { }

  /**
   * Function to be executed after sublist is inserted, removed, or edited.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @since 2015.2
   */
  function sublistChanged(scriptContext) { }

  /**
   * Function to be executed after line is selected.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @since 2015.2
   */
  function lineInit(scriptContext) { }

  /**
   * Validation function to be executed when field is changed.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   * @param {string} scriptContext.fieldId - Field name
   * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
   * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
   *
   * @returns {boolean} Return true if field is valid
   *
   * @since 2015.2
   */
  function validateField(scriptContext) { }

  /**
   * Validation function to be executed when sublist line is committed.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @returns {boolean} Return true if sublist line is valid
   *
   * @since 2015.2
   */
  function validateLine(scriptContext) { }

  /**
   * Validation function to be executed when sublist line is inserted.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @returns {boolean} Return true if sublist line is valid
   *
   * @since 2015.2
   */
  function validateInsert(scriptContext) { }

  /**
   * Validation function to be executed when record is deleted.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @returns {boolean} Return true if sublist line is valid
   *
   * @since 2015.2
   */
  function validateDelete(scriptContext) { }

  /**
   * Validation function to be executed when record is saved.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @returns {boolean} Return true if record is valid
   *
   * @since 2015.2
   */
  function saveRecord(scriptContext) { }

  function refreshPage() {
    window.onbeforeunload = null;
    let currentRec = currentRecord.get();

    let rentalPeriod = currentRec.getValue("rental_period");

    let postingPeriod = currentRec.getValue("posting_period");

    let rentalMonthParam = currentRec.getValue("rental_month");

    let customer = currentRec.getValue("customer");

    let subsidiary = currentRec.getValue("subsidiary_filter");

    console.log("rentalPeriod " + rentalPeriod);

    console.log("postingPeriod " + postingPeriod);

    console.log("rentalMonthParam " + rentalMonthParam);

    console.log("customer " + customer);

    console.log("subsidiary " + subsidiary);

    var suiteletURL = url.resolveScript({
      scriptId: "customscript_ps_sl_revenue_recognition",
      deploymentId: "customdeploy_ps_sl_revenue_recognition",
      params: {
        rentalPeriod: rentalPeriod,
        postingPeriod: postingPeriod,
        rentalMonthParam: rentalMonthParam,
        customer: customer,
        subsidiary_filter: subsidiary,
        submit: true,
      },
    });

    window.location.replace(suiteletURL);
  }

  function exportToCSV() {
    let currentRec = currentRecord.get();
    // let rentalPeriod = currentRec.getValue("rental_period");
    let rentalPeriod = currentRec.getValue("rental_month");
    let postingPeriod = currentRec.getValue("posting_period");
    let customer = currentRec.getValue("customer");
    let subsidiary = currentRec.getValue("subsidiary_filter");

    console.log("postingPeriod==" + postingPeriod);

    console.log("rentalPeriod==" + rentalPeriod);

    console.log("customer==" + customer);
    // update code arslan
    window.onbeforeunload = null;

    var suiteletURL = url.resolveScript({
      scriptId: "customscript_ps_sl_revenue_recognition",
      deploymentId: "customdeploy_ps_sl_revenue_recognition",
      params: {
        rentalPeriod: rentalPeriod,
        postingPeriod: postingPeriod,
        customer: customer,
        subsidiary_filter: subsidiary,
        submit: true,
        export: true,
      },
    });
    window.location.replace(suiteletURL);
  }

  return {
    pageInit: pageInit,
    refreshPage: refreshPage,
    exportToCSV: exportToCSV
  };
});
