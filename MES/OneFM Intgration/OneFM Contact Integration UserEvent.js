/*----------------------------------------------------------------------------------------------
		Company Name 	:	Nuvista Technologies Pvt Ltd
		Script Name 	:	OneFM Contact Integration UserEvent
		Author 			:  	NVT Employee 
		Date            :   28-07-2021 
		Description		:	1. The Script is created for Migrating Contact to OneFM system.
							i) Create NS Contact details send to OneFM System
							ii) Edit NS Contact details send to OneFM System
							iii) Delete NS Contact details send to OneFM System
------------------------------------------------------------------------------------------------*/

/**
 *@NApiVersion 2.0
 *@NScriptType UserEventScript
 *@NModuleScope Public
 */
//This function is used to send create/update Contact record from NS to OneFM

//define(['N/config','N/format','N/record','N/url','N/runtime','N/http','N/search','N/xml','/SuiteScripts/OneFM Integration Scripts/OneFM_Lib.js'],
define([
  "N/config",
  "N/format",
  "N/record",
  "N/url",
  "N/runtime",
  "N/http",
  "N/search",
  "N/xml",
  "./OneFM_Lib.js",
  "N/https",
], function (
  config,
  format,
  record,
  url,
  runtime,
  http,
  search,
  xml,
  libjs,
  https
) {
  //Begin: AfterSubmit functionality
  function afterSubmitContact_OneFM(context) {
    try {
      var currentRec = context.newRecord;
      var customer_id = "";
      //Begin : Contact Edit functionality
      if (nullCheck(currentRec)) {
        //If record is created then only all validation will work
        if (context.type != context.UserEventType.DELETE) {
          var loadRecord = record.load({
            type: currentRec.type,
            id: currentRec.id,
            isDynamic: true,
          });
          customer_id = loadRecord.getValue({ fieldId: "company" });
        }
      }
      log.debug("afterSubmitContact_OneFM", "context.type : " + context.type);
      if (context.type == context.UserEventType.CREATE) {
        set_rolewise_email(context, record);
        var is_contract_created = get_contract_search(customer_id, search);
        log.debug(
          "afterSubmitContact_OneFM",
          "is_contract_created : " + is_contract_created
        );
        if (parseFloat(is_contract_created) > 0) {
          CreateContact_OneFM(
            context,
            config,
            format,
            record,
            url,
            runtime,
            http,
            search,
            xml,
            https
          );
        }
      }
        if (context.type == context.UserEventType.EDIT) {
          set_rolewise_email(context, record);
          var is_contract_created = get_contract_search(customer_id, search);
          log.debug(
            "afterSubmitContact_OneFM",
            "is_contract_created : " + is_contract_created
          );
          if (parseFloat(is_contract_created) > 0) {
            EditContact_OneFM(
              context,
              config,
              format,
              record,
              url,
              runtime,
              http,
              search,
              xml,
              https
            );
          }
        }
      if (context.type == context.UserEventType.DELETE) {
        // var is_contract_created =get_contract_search(customer_id,search);
        // if(parseFloat(is_contract_created)>0)
        {
          DeleteContact_OneFM(
            context,
            config,
            format,
            record,
            url,
            runtime,
            http,
            search,
            xml,
            https
          );
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
    //End: AfterSubmit functionality
  }
  //Begin: beforeSubmitContact_OneFM functionality
  function beforeSubmitContact_OneFM(context) {
    try {
      if (context.type != context.UserEventType.DELETE) {
        log.debug("beforesubmittype", context.type);
        var customerRecord = context.newRecord;
        var contact_role = customerRecord.getValue({
          fieldId: "custentity_ofm_contact_roletagged",
        });
        var standard_role = customerRecord.getValue({ fieldId: "contactrole" });
        //set role from custom field to standard field
        customerRecord.setValue({
          fieldId: "contactrole",
          value: contact_role,
        });
        if (context.type == context.UserEventType.CREATE) {
          if (nullCheck(standard_role)) {
            customerRecord.setValue({
              fieldId: "contactrole",
              value: standard_role,
            });
            customerRecord.setValue({
              fieldId: "custentity_ofm_contact_roletagged",
              value: standard_role,
            });
          }
        }
        /* // this is commented on 9.11.21 - to fix issue custom role not setting proper,
                if (context.type == context.UserEventType.EDIT){
                   log.debug('beforesubmit',standard_role);
					if(nullCheck(standard_role)){
						customerRecord.setValue({fieldId: 'custentity_ofm_contact_roletagged',value:standard_role});
					}
                }*/
      }
    } catch (err) {
      log.debug({ title: "err", details: err });
    }
  }
  //End: beforeSubmitContact_OneFM functionality

  //Begin: BeforeLoad functionality
  function beforeLoadContact_OneFM(context) {
    try {
      log.debug({ title: "context.type", details: context.type });
      //Create button to transfer contract details to oneFM manually.
      if (context.type == "view") {
        var currentRec = context.newRecord;
        var ofm_contacttransfered_create = currentRec.getValue(
          "custentity_ofm_contacttransfertoonefm"
        );
        var customer_id = currentRec.getValue("company");
        var customer_category = "";
        if (nullCheck(customer_id)) {
          var load_customer_record = record.load({
            type: record.Type.CUSTOMER,
            id: customer_id,
            isDynamic: true,
          });
          customer_category = load_customer_record.getValue("category");
        }
        if (ofm_contacttransfered_create == false && customer_category == 2) {
          // previously 5
          //if Contact is Create and not transfered then show button to transfer manually
          var form = context.form;
          form.addButton({
            id: "custpage_button",
            label: "OneFm Contact Transfer",
            functionName: "CreateContact_OneFM",
          });
          //context.form.clientScriptModulePath = 'SuiteScripts/OneFM Integration Scripts/OneFM Contact Integration Client.js';
          context.form.clientScriptModulePath =
            "./OneFM Contact Integration Client.js";
        }
      }
    } catch (err) {
      log.debug({ title: "err", details: err });
    }
  }
  //End: BeforeLoad functionality

  return {
    afterSubmit: afterSubmitContact_OneFM,
    beforeSubmit: beforeSubmitContact_OneFM,
    beforeLoad: beforeLoadContact_OneFM,
  };
});

function CreateContact_OneFM(
  context,
  config,
  format,
  record,
  url,
  runtime,
  http,
  search,
  xml,
  https
) {
  try {
    //API for contact Create
    //var postURL = 'http://dev.mesonefm.com.sg/api/netsuite/client/contact/create';
    var postURL = getURL_fun() + "api/netsuite/client/contact/create";
    log.debug("postURL", postURL);
    //Header Parameter
    var headerObj = getHeaderObject();
    log.debug({ title: "headerObj", details: JSON.stringify(headerObj) });

    var ns_company_id = "",
      ns_contact_id = "",
      person_name = "",
      phone = "",
      role_id = "",
      email = "",
      designation = "",
      mobile_number = "";
    var is_primary = false;
    var currentRec = context.newRecord;
    //Begin : Contact create functionality
    if (nullCheck(currentRec)) {
      //If record is created then only all validation will work
      var loadRecord = record.load({
        type: currentRec.type,
        id: currentRec.id,
        isDynamic: true,
      });

      //COMPANY field
      ns_company_id = loadRecord.getValue({ fieldId: "company" });
      //Contact internal id
      ns_contact_id = currentRec.id;
      //CONTACT Name
      person_name = loadRecord.getValue({ fieldId: "entityid" });
      phone = loadRecord.getValue({ fieldId: "phone" }).replace(/^\+65/, "");
      mobile_number = loadRecord.getValue({ fieldId: "mobilephone" }).replace(/^\+65/, "");
      email = loadRecord.getValue({ fieldId: "email" });
      role_id = loadRecord.getValue({ fieldId: "contactrole" });

      if (role_id == 3) {
        // if(role_id == -10){
        designation = "Primary";
        is_primary = true;
      } else if (role_id == 1) {
        designation = "Director In-Charge";
      } else if (role_id == 2) {
        designation = "Operations In-Charge";
      } else if (role_id == -10) {
        //if(role_id == 3)
        designation = "Accounts In-Charge";
      }
      /*else{
								designation = loadRecord.getText({fieldId: 'contactrole'});
							}*/
      //Begin: Prepare Array to send to OneFM in Post method

      //Do EscapeXML for string data and then preapare POst array to send
      ns_company_id = xml.escape({ xmlText: ns_company_id });
      //ns_contact_id	=	        xml.escape({xmlNumber : ns_contact_id});                not support Number
      person_name = xml.escape({ xmlText: person_name });
      phone = xml.escape({ xmlText: phone });
      mobile_number = xml.escape({ xmlText: mobile_number });
      email = xml.escape({ xmlText: email });
      designation = xml.escape({ xmlText: designation });
      //is_primary	=	        	xml.escape({xmlText : is_primary});                 not support Boolean
      var postarray = {
        netsuite_company_id: ns_company_id,
        netsuite_contact_id: ns_contact_id,
        person_name: person_name,
        phone: phone,
        email: email,
        designation: designation,
        is_primary: is_primary,
        mobile: mobile_number,
      };
      log.debug("postarray", "postarray :" + JSON.stringify(postarray));

      var response = https.post({
        url: postURL,
        body: JSON.stringify(postarray),
        headers: headerObj,
      });
      loadRecord.setValue({
        fieldId: "custentity_ofm_onefmrequestfield_entity",
        value: JSON.stringify(postarray),
      });
      if (nullCheck(response)) {
        log.debug(
          "PostMethod",
          "response Code:" + response.code + "response body:" + response.body
        );
        var oneFmResponse =
          "Response Code : " +
          response.code +
          " Response Body : " +
          response.body;
        loadRecord.setValue({
          fieldId: "custentity_ofm_customer_ofmcustomerrespo",
          value: oneFmResponse,
        });
        if (response.code == 200)
          loadRecord.setValue({
            fieldId: "custentity_ofm_contacttransfertoonefm",
            value: true,
          });
      }
      loadRecord.save();
    }
    //End : Contact create functionality
  } catch (err) {
    log.debug({ title: "Create Action Error", details: err });
    if (err.details) {
      return { statuscode: "406", success: "false", message: err.details };
    } else if (err.code) {
      return { statuscode: "407", success: "false", message: err.code };
    } else if (err.message) {
      return { statuscode: "408", success: "false", message: err.message };
    }
  }
}

function EditContact_OneFM(
  context,
  config,
  format,
  record,
  url,
  runtime,
  http,
  search,
  xml,
  https
) {
  try {
    //API for contact Edit
    //var postURL = 'http://dev.mesonefm.com.sg/api/netsuite/client/contact/edit';
    var postURL = getURL_fun() + "api/netsuite/client/contact/edit";
    //Header Parameter
    var headerObj = getHeaderObject();
    log.debug({ title: "headerObj", details: JSON.stringify(headerObj) });
    log.debug({ title: "postURL", details: postURL });

    var ns_company_id = "",
      ns_contact_id = "",
      person_name = "",
      phone = "",
      role_id = "",
      email = "",
      designation = "",
      mobile_number = "";
    var is_primary = false;
    var currentRec = context.newRecord;
    //Begin : Contact Edit functionality
    if (nullCheck(currentRec)) {
      //If record is created then only all validation will work
      var loadRecord = record.load({
        type: currentRec.type,
        id: currentRec.id,
        isDynamic: true,
      });

      //ns_company_id = loadRecord.getValue({fieldId: 'company'});
      ns_contact_id = currentRec.id;
      person_name = loadRecord.getValue({ fieldId: "entityid" });
      phone = loadRecord.getValue({ fieldId: "phone" }).replace(/^\+65/, "");
      mobile_number = loadRecord.getValue({ fieldId: "mobilephone" }).replace(/^\+65/, "");
      email = loadRecord.getValue({ fieldId: "email" });
      // role_id = loadRecord.getValue({ fieldId: "contactrole" });
      role_id = loadRecord.getValue({ fieldId: "custentity_ofm_contact_roletagged" });
      // Commented following code on 16-Nov-2021 for role change
      // if(role_id == -10){
      if (role_id == 3) {
        designation = "Primary";
        is_primary = true;
      } else if (role_id == 1) {
        designation = "Director In-Charge";
      } else if (role_id == 2) {
        designation = "Operations In-Charge";
      } else if (role_id == -10) {
        //else  if(role_id == 3)
        designation = "Accounts In-Charge";
      }else if (role_id == 4) {
        //else  if(role_id == 3)
        designation = "Finance";
      }
      /*else{
								designation = loadRecord.getText({fieldId: 'contactrole'});
							}*/
      //Do EscapeXML for string data and then preapare POst array to send
      //ns_contact_id	=	        xml.escape({xmlNumber : ns_contact_id});     //not support Number Value
      //ns_contact_id = format.format({value:ns_contact_id, type: format.Type.TEXT});
      person_name = xml.escape({ xmlText: person_name });
      phone = xml.escape({ xmlText: phone });
      email = xml.escape({ xmlText: email });
      designation = xml.escape({ xmlText: designation });
      mobile_number = xml.escape({ xmlText: mobile_number });
      //Begin: Prepare Array to send to OneFM in Post method
      var postarray = {
        netsuite_contact_id: ns_contact_id,
        netsuite_contact_id: ns_contact_id,
        person_name: person_name,
        phone: phone,
        email: email,
        designation: designation,
        is_primary: is_primary,
        mobile: mobile_number,
      };
      log.debug("postarray==123", "postarray :" + JSON.stringify(postarray));

      var response = https.post({
        url: postURL,
        body: JSON.stringify(postarray),
        headers: headerObj,
      });

      loadRecord.setValue({
        fieldId: "custentity_ofm_onefmrequestfield_entity",
        value: JSON.stringify(postarray),
      });
      if (nullCheck(response)) {
        log.debug(
          "PostMethod",
          "response Code:" + response.code + "response body:" + response.body
        );
        var oneFmResponse =
          "Response Code : " +
          response.code +
          " Response Body : " +
          response.body;
        loadRecord.setValue({
          fieldId: "custentity_ofm_customer_ofmcustomerrespo",
          value: oneFmResponse,
        });
        //if(response.code == 200)
        //loadRecord.setValue({fieldId: 'custbody_ofm_contracttransfered_create', value: true});
      }
      loadRecord.save();
    }
    //End : Contact Edit functionality
  } catch (err) {
    log.debug({ title: "Edit Action Error", details: err });
    if (err.details) {
      return { statuscode: "406", success: "false", message: err.details };
    } else if (err.code) {
      return { statuscode: "407", success: "false", message: err.code };
    } else if (err.message) {
      return { statuscode: "408", success: "false", message: err.message };
    }
  }
}

function DeleteContact_OneFM(
  context,
  config,
  format,
  record,
  url,
  runtime,
  http,
  search,
  xml,
  https
) {
  try {
    //API for contact Delete
    //var postURL = 'http://dev.mesonefm.com.sg/api/netsuite/client/contact/delete';
    var postURL = getURL_fun() + "api/netsuite/client/contact/delete";
    var headerObj = getHeaderObject();
    log.debug({ title: "headerObj", details: JSON.stringify(headerObj) });

    var ns_contact_id = context.newRecord.id;
    //Begin : Contact Delete Functionality
    if (nullCheck(ns_contact_id)) {
      var postarray = {
        netsuite_contact_id: ns_contact_id,
      };
      log.debug("postarray", "postarray :" + JSON.stringify(postarray));

      var response = https.post({
        url: postURL,
        body: JSON.stringify(postarray),
        headers: headerObj,
      });

      if (nullCheck(response)) {
        log.debug(
          "PostMethod",
          "response Code:" + response.code + "response body:" + response.body
        );
        //var oneFmResponse = response.code + response.body;
        //loadRecord.setValue({fieldId: 'custentity_ofm_customer_ofmcustomerrespo', value: oneFmResponse});
        //if(response.code == 200)
        //loadRecord.setValue({fieldId: 'custbody_ofm_contracttransfered_create', value: true});
        //loadRecord.save();
      }
    }
    //End : Contact Delete Functionality
  } catch (err) {
    log.debug({ title: "Delete Action Error", details: err });
    if (err.details) {
      return { statuscode: "406", success: "false", message: err.details };
    } else if (err.code) {
      return { statuscode: "407", success: "false", message: err.code };
    } else if (err.message) {
      return { statuscode: "408", success: "false", message: err.message };
    }
  }
}

//Begin:get rolewise email from contact and set it to customer
function set_rolewise_email(context, record) {
  try {
    var currentRec = context.newRecord;
    var loadRecord = record.load({
      type: currentRec.type,
      id: currentRec.id,
      isDynamic: true,
    });
    var contact_role = loadRecord.getValue({
      fieldId: "custentity_ofm_contact_roletagged",
    });
    var contact_email = loadRecord.getValue({ fieldId: "email" });
    if (nullCheck(contact_role) && nullCheck(contact_email)) {
      var get_customer_id = loadRecord.getValue({ fieldId: "company" });
      if (nullCheck(get_customer_id)) {
        var load_customer_record = record.load({
          type: record.Type.CUSTOMER,
          id: get_customer_id,
          isDynamic: true,
        });
        if (contact_role == "-10") {
          //-10 Primary
          load_customer_record.setValue({
            fieldId: "email",
            value: contact_email,
          });
        } else if (contact_role == "3") {
          //3 Accounts in charge
          load_customer_record.setValue({
            fieldId: "custentity_ofm_cus_emailidaccountsinchar",
            value: contact_email,
          });
        } else if (contact_role == "2") {
          //2 Operation in charge
          load_customer_record.setValue({
            fieldId: "custentity_ofm_cus_emailopsincharge",
            value: contact_email,
          });
        } else if (contact_role == "1") {
          //1 Director in charge
          load_customer_record.setValue({
            fieldId: "custentity_ofm_customer_emailiddirect",
            value: contact_email,
          });
        }
        load_customer_record.save();
      }
    }
  } catch (err) {
    log.debug({ title: "Create Action Error", details: err });
  }
}
//End:get rolewise email from contact and set it to customer
