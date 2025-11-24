/*----------------------------------------------------------------------------------------------
    Company Name 	:	Nuvista Technologies Pvt Ltd
    Script Name 	:	OneFM Contract Integration
    Author 			:  	NVT Employee 
    Date            :   07-07-2021 
    Description		:	1. The Script is created for Migrating Sales Order (Contract/Job Order) to OneFM system on Create/Update.
              2. Record should be migrated when status is Approved


------------------------------------------------------------------------------------------------*/

/**
 *@NApiVersion 2.0
 *@NScriptType UserEventScript
 *@NModuleScope Public
 */
//This function is used to send create/update Sales Order (Contract/Job Order) from NS to OneFM

//Begin : User Event Script : After Submit function
define([
  "N/config",
  "N/format",
  "N/record",
  "N/url",
  "N/runtime",
  "N/http",
  "N/search",
  "N/ui/serverWidget",
], function (config, format, record, url, runtime, http, search, serverWidget) {
  //Begin: BeforeLoad functionality
  function beforeLoadContract_OneFM(context) {
    try {
      // log.debug({ title: "context.type", details: context.type });
      //Create button to transfer contract details to oneFM manually.
      if (context.type == "view") {
        var currentRec = context.newRecord;

        var contract_obj = record.load({
          type: currentRec.type,
          id: currentRec.id,
          isDynamic: true,
        });
        var custom_form = contract_obj.getValue({ fieldId: "customform" });

        //var custom_form = currentRec.getValue('customform');
        log.debug({ title: "custom_form", details: custom_form });
        if (custom_form == 117 || custom_form == 152) {
          //101----Dormitory Contract Form
          var orderstatus = currentRec.getValue("orderstatus");
          var ofm_contracttransfered_create = currentRec.getValue(
            "custbody_ofm_contracttransfered_create"
          );
          var ofm_edit_failure_check = currentRec.getValue(
            "custbody_ofm_onfmeditfailcheck"
          );
          var ofm_edit_transfer_contract = currentRec.getValue(
            "custbody_ofm_contract_editconttransfer"
          );
          var ofm_update_contract_unit_detail = currentRec.getValue(
            "custbody_ofm_update_contract_unit_deta"
          ); //code added on 17.12.21-For approved contract edit issue
          log.debug(
            "",
            "orderstatus :" +
            orderstatus +
            " | ofm_contracttransfered_create : " +
            ofm_contracttransfered_create +
            "|currentRec.id:" +
            currentRec.id
          );
          //A	Pending Approval
          //F	Pending Billing i.e approved
          //   if (currentRec.id == "607897") {
          //     //Temporary Fix added on 9.3.22 - contract to show button Create Transfer
          //     log.debug({
          //       title: "Test 123456",
          //       details: "YES",
          //     });
          //     var form = context.form;
          //     //form.clientScriptFileId = 'SuiteScripts/OneFM Contract Integration Client.js';
          //     form.addButton({
          //       id: "custpage_button",
          //       label: "OneFm Create Transfer",
          //       functionName: "approvedContract_OneFM",
          //     });
          //     //context.form.clientScriptModulePath = 'SuiteScripts/OneFM Integration Scripts/OneFM Contract Integration Client.js';
          //     context.form.clientScriptModulePath =
          //       "./OneFM Contract Integration Client.js";
          //   } ////Temporary Fix added on 9.3.22 - contract to show button Create Transfer
          if (ofm_contracttransfered_create != true && orderstatus == "F") {
            //if Contract is Create - approved and not transfered then show button to transfer manually
            log.debug({
              title: "Test 123",
              details: "YES",
            });
            var form = context.form;
            //form.clientScriptFileId = 'SuiteScripts/OneFM Contract Integration Client.js';
            form.addButton({
              id: "custpage_button",
              label: "OneFm Create Transfer",
              functionName: "approvedContract_OneFM",
            });
            //context.form.clientScriptModulePath = 'SuiteScripts/OneFM Integration Scripts/OneFM Contract Integration Client.js';
            context.form.clientScriptModulePath =
              "./OneFM Contract Integration Client.js";
          } else if (
            ofm_contracttransfered_create == true &&
            orderstatus == "F" &&
            ofm_edit_failure_check == true &&
            ofm_edit_transfer_contract == false
          ) {
            //if Contract is Edit - approved and not transfered then show button to transfer manually
            var form = context.form;
            log.debug({
              title: "Test 1",
              details: "YES",
            });
            //form.clientScriptFileId = 'SuiteScripts/OneFM Contract Integration Client.js';
            form.addButton({
              id: "custpage_editbutton",
              label: "OneFm Edit Transfer",
              functionName: "edit_approvedContract_OneFM",
            });
            //context.form.clientScriptModulePath = 'SuiteScripts/OneFM Integration Scripts/OneFM Contract Integration Client.js';
            context.form.clientScriptModulePath =
              "./OneFM Contract Integration Client.js";
          } else if (ofm_update_contract_unit_detail == true) {
            //code added on 17.12.21-For approved contract edit issue - new button added
            var form = context.form;
            log.debug({
              title: "Test 2",
              details: "YES",
            });
            //form.clientScriptFileId = 'SuiteScripts/OneFM Contract Integration Client.js';
            form.addButton({
              id: "custpage_ofmretransferbutton",
              label: "OneFm Edit Transfer",
              functionName: "edit_approvedContract_OneFM",
            });

            form.addField({
              id: "custpage_header",
              type: serverWidget.FieldType.INLINEHTML,
              label: " ",
            }).defaultValue =
              "<style>#custpage_ofmretransferbutton{background: red !important;color: #fff !important;}</style>";

            context.form.clientScriptModulePath =
              "./OneFM Contract Integration Client.js";
          }
        }
      }
    } catch (err) {
      log.debug({ title: "err", details: err });
      if (err.details) {
        return { statuscode: "406", success: "false", message: err.details };
      } else if (err.code) {
        return { statuscode: "407", success: "false", message: err.code };
      } else if (err.message) {
        return { statuscode: "408", success: "false", message: err.message };
      }
    }
  }
  //End: BeforeLoad functionality

  return {
    beforeLoad: beforeLoadContract_OneFM,
  };
});

function nullCheck(value) {
  if (value != null && value != "" && value != undefined) return true;
  else return false;
}
