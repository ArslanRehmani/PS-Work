/*----------------------------------------------------------------------------------------------
    Company Name 	:	Nuvista Technologies Pvt Ltd
    Script Name 	:	OneFM Customer Integration UserEvent
    Author 			:  	NVT Employee 
    Date            :   28-07-2021 
    Description		:	1. The Script is created for validation on dormitory unit.
                        2. Open window on fieldchanged

------------------------------------------------------------------------------------------------*/

/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 */
var mode = "";
define([
  "N/currentRecord",
  "N/format",
  "N/ui/dialog",
  "N/search",
  "N/runtime",
  "N/https",
  "N/ui/dialog"
], function (currentRecord, format, dialog, search, runtime, https, dialog) {
  function pageInit(context) {
    mode = context.mode;
  }
  //Begin: fieldChanged functionality
  function fieldChanged(context) {
    try {
      var currentRec = currentRecord.get();
      var from_contract = currentRec.getValue({ fieldId: "custbody_swe_from_contract" });
      // if(!from_contract){
      //   return;
      // }
      var custom_form = currentRec.getValue({ fieldId: "customform" });
      if (custom_form == 117 || custom_form == 152) {
        console.log({
          title: "custom_form",
          details: custom_form,
        });
        //117----MES - Sales Order - Contract Renewals - Dormitory
        var fieldId = context.fieldId;
        if (fieldId == "custrecord_ofm_contract_checkunitavailab") {

          //var currentRec = currentRecord.get();
          var contract_start_date = currentRec.getValue({
            fieldId: "startdate",
          });
          var buffer_days = currentRec.getText({
            fieldId: "custbody_ofm_unitavailabilitybufferday",
          });
          console.log({
            title: "buffer_days",
            details: buffer_days,
          });
          if (!nullCheck(buffer_days)) {
            buffer_days = 0;
          }
          var converted_contract_start_date = new Date(contract_start_date);
          converted_contract_start_date.setDate(
            converted_contract_start_date.getDate() - Number(buffer_days)
          );
          var contract_startParseDate = format.format({
            value: converted_contract_start_date,
            type: format.Type.DATE,
          });
          console.log({
            title: "contract_startParseDate===",
            details: contract_startParseDate,
          });
          //log.debug('contract_startParseDate', contract_startParseDate);
          var billing_startParseDate = "";
          var billing_endParseDate = "";
          var is_unit_set = currentRec.getCurrentSublistValue({
            sublistId: "recmachcustrecord_dormitory_salesorderref",
            fieldId: "custrecord_ofm_contract_checkunitavailab",
          });
          if (is_unit_set == true) {
            var postal_code = currentRec.getCurrentSublistValue({
              sublistId: "recmachcustrecord_dormitory_salesorderref",
              fieldId: "custrecord_dormitory_postalcode",
            });
            var billing_start_date = currentRec.getCurrentSublistValue({
              sublistId: "recmachcustrecord_dormitory_salesorderref",
              fieldId: "custrecord_dormitory_startdate",
            });
            if (nullCheck(billing_start_date)) {
              billing_startParseDate = format.format({
                value: new Date(billing_start_date),
                type: format.Type.DATE,
              });
            }
            var billing_end_date = currentRec.getCurrentSublistValue({
              sublistId: "recmachcustrecord_dormitory_salesorderref",
              fieldId: "custrecord_dormitory_terminationdate",
            });
            if (nullCheck(billing_end_date)) {
              billing_endParseDate = format.format({
                value: new Date(billing_end_date),
                type: format.Type.DATE,
              });
            }
            if (nullCheck(postal_code)) {
              //Begin:Open window (suitelet)
              var url = nlapiResolveURL(
                "SUITELET",
                "customscript_onefm_contract_unit_avail",
                "customdeploy_onefm_contract_unit_avail",
                false
              );
              url += "&postal_code_param=" + postal_code;
              url += "&contract_start_date_param=" + contract_startParseDate;
              url += "&billing_start_date_param=" + billing_startParseDate;
              url += "&billing_end_date_param=" + billing_endParseDate;
              var unit_window = window.open(
                url,
                "_blank",
                "toolbar=no,menubar=0,status=0,copyhistory=0,scrollbars=yes,resizable=0,location=-100,Width=450,Height=400",
                true
              );
              unit_window.moveTo(400, 200);
              //End:Open window (suitelet)
            } else {
              //validation for mandatory field(postal code)
              var options = {
                title: "Mandatory",
                message: "Plaese select postal code.",
              };
              dialog.alert(options);
              currentRec.setCurrentSublistValue({
                sublistId: "recmachcustrecord_dormitory_salesorderref",
                fieldId: "custrecord_ofm_contract_checkunitavailab",
                value: false,
                ignoreFieldChange: true,
              });

              //alert('plaese select postal code');
            }
          }
        }
      }

    } catch (e) {
      log.debug("onRequest:error", e);
    }
  }
  //End: fieldChanged functionality

  //Begin: saveRecord functionality
  function saveRecord(context) {
    var currentRec = currentRecord.get();
    var userObj = runtime.getCurrentUser();
    var role = userObj.role;

    //Begin: If on custmer 'Group Invoice' is checked then on contract auto click 'forinvoicegrouping'
    if (mode == "create" || mode == "copy") {
      var customer = currentRec.getValue({ fieldId: "entity" }); //alert('customer : '+customer);
      var fieldLookUpCust = search.lookupFields({
        type: search.Type.CUSTOMER,
        id: customer, //Record ID
        columns: ["groupinvoices"],
      });
      var isGroupInv = fieldLookUpCust["groupinvoices"]; //alert('isGroupInv : '+isGroupInv);
      if (isGroupInv == true)
        currentRec.setValue({ fieldId: "forinvoicegrouping", value: true });
    }
    //End: If on custmer 'Group Invoice' is checked then on contract auto click 'forinvoicegrouping'
    var custom_form = currentRec.getValue({ fieldId: "customform" });
    if (custom_form == 117) {
      //117----MES - Sales Order - Contract Renewals - Dormitory
      var line_count = currentRec.getLineCount({
        sublistId: "recmachcustrecord_dormitory_salesorderref",
      });
      var flag_is_terminated = 0;
      var dorm_unit_array = [];
      var unique_dorm_unit_array = [];
      var is_both_chekbox_cheked = false;
      for (var index = 0; index < line_count; index++) {
        var is_terminated = currentRec.getSublistValue({
          sublistId: "recmachcustrecord_dormitory_salesorderref",
          fieldId: "custrecord_ofm_contract_unitterminated",
          line: index,
        });
        var is_updated = currentRec.getSublistValue({
          sublistId: "recmachcustrecord_dormitory_salesorderref",
          fieldId: "custrecord_ofm_dormitory_unitupdated",
          line: index,
        });
        var dorm_unit = currentRec.getSublistValue({
          sublistId: "recmachcustrecord_dormitory_salesorderref",
          fieldId: "custrecord_dormitory_unitno",
          line: index,
        });
        if (is_terminated == true) {
          flag_is_terminated++;
        }
        if (nullCheck(dorm_unit)) {
          dorm_unit_array.push(dorm_unit);
        }
        if (is_terminated == true && is_updated == true) {
          is_both_chekbox_cheked = true;
        }
      }
      var count = parseFloat(line_count) - parseFloat(flag_is_terminated);
      if (is_both_chekbox_cheked == true) {
        alert(
          "Unit terminated and unit updated both checkbox should not checked at time"
        );
        return false;
      }
      if (line_count == 1) {
        var is_terminated = currentRec.getSublistValue({
          sublistId: "recmachcustrecord_dormitory_salesorderref",
          fieldId: "custrecord_ofm_contract_unitterminated",
          line: 0,
        });
        if (is_terminated == true) {
          alert("At least one unit must be allocated");
          return false;
        } else {
          return true;
        }
      } else if (line_count > 1) {
        var unique_dorm_unit_array_length = 0;
        if (nullCheck(dorm_unit_array)) {
          unique_dorm_unit_array = removeDuplicates(dorm_unit_array);
        }
        if (nullCheck(unique_dorm_unit_array)) {
          unique_dorm_unit_array_length = unique_dorm_unit_array.length;
        }
        /*if(parseFloat(unique_dorm_unit_array_length)<parseFloat(line_count)){
          alert('Unit number must be unique!');
          return false;
        } commented in UAT*/
        if (parseFloat(count) > 1 && role != 3) {
          alert("Only one unit must be allocated!");
          return false;
        } else if (parseFloat(count) == 0) {
          alert("At least one unit must be allocated");
          return false;
        }
        return true;
      } else {
        return true;
      }
      return true;
    }
    return true;
  }
  //End: saveRecord functionality

  function validateLine(context) {
    var title = 'validateLine[::]';
    try {
      var currentRec = currentRecord.get();

      var contract_start_date123 = currentRec.getValue({
        fieldId: "startdate",
      });
      log.debug({
        title: 'contract_start_date123',
        details: contract_start_date123
      });
      var contract_end_date123 = currentRec.getValue({
        fieldId: "enddate",
      });
      log.debug({
        title: 'contract_end_date123',
        details: contract_end_date123
      });
      var sDate = formatDate(contract_start_date123);

      log.debug({
        title: 'sDate',
        details: sDate
      });

      var unitId = currentRec.getCurrentSublistValue({
        sublistId: "recmachcustrecord_dormitory_salesorderref",
        fieldId: "custrecord_dormitory_unitno"
      });

      log.debug({
        title: 'unitId==========',
        details: unitId
      });

      var oneFMInternalId = search.lookupFields({
        type: 'customrecord_dormitory_unitmaster',
        id: unitId,
        columns: ['custrecord_onefminternalid']
      }).custrecord_onefminternalid;

      log.debug({
        title: 'oneFMInternalId==========',
        details: oneFMInternalId
      });

      //new Code

      var postURL = getURL_fun() + "api/netsuite/unit/status/get";
      log.debug({ title: 'postURL', details: postURL });
      var headerObj = getHeaderObject();
      log.debug({ title: 'headerObj', details: JSON.stringify(headerObj) });
      var body = { "unit_id": oneFMInternalId, "start_date": formatDate(contract_start_date123), "end_date": formatDate(contract_end_date123) }


      var response = https.post({
        url: postURL,
        body: JSON.stringify(body),
        headers: headerObj,
      });
      var data = JSON.parse(response.body);

      var unitStatus = data.data.current_status;

      log.debug({
        title: 'unitStatus',
        details: unitStatus
      });
      if (unitStatus == 'Occupied') {
        // //Begin:Open window (suitelet)
        // var url = nlapiResolveURL(
        //   "SUITELET",
        //   "customscript_onefm_unit_availstatus",
        //   "customdeploy_onefm_unit_availstatus",
        //   false
        // );
        // var unit_window = window.open(
        //   url,
        //   "_blank",
        //   "toolbar=no,menubar=0,status=0,copyhistory=0,scrollbars=yes,resizable=0,location=-100,Width=450,Height=400",
        //   true
        // );
        // unit_window.moveTo(400, 200);
        var options = {
          title: "Mandatory",
          message: '<p><font face="Verdana" size="5" color="#FFA500"><B>Units not available</B></font></p>',
        };
        dialog.alert(options);
        return false;

      }
    } catch (e) {
      log.error(title + e.name, e.message);
    }
    return true;
  }

  //Begin:To check null values
  function nullCheck(value) {
    if (value != null && value != "" && value != undefined) return true;
    else return false;
  }
  //End:To check null values

  //Begin:To remove Duplicate element from array
  function removeDuplicates(array) {
    var x = {};
    array.forEach(function (i) {
      if (!x[i]) {
        x[i] = true;
      }
    });
    return Object.keys(x);
  }
  //End: To remove Duplicate element from array
  function formatDate(dateStr) {
    var title = 'formatDate[::]';
    try {
      var date = new Date(dateStr);

      var day = ("0" + date.getUTCDate()).slice(-2); // always 2 digits
      var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      var month = monthNames[date.getUTCMonth()];
      var year = date.getUTCFullYear();

      var formattedDate = day + " " + month + " " + year;
    } catch (e) {
      log.error(title + e.name, e.message);
    }
    return formattedDate;
  }
  return {
    pageInit: pageInit,
    fieldChanged: fieldChanged,
    saveRecord: saveRecord
    // validateLine: validateLine
  };
});
