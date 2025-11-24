/*----------------------------------------------------------------------------------------------
		Company Name 	:	Nuvista Technologies Pvt Ltd
		Script Name 	:	OneFM Contact Integration UserEvent
		Author 			:  	NVT Employee 
		Date            :   07-09-2021 
		Description		:	This Script is created for disable contact role field
							
------------------------------------------------------------------------------------------------*/

/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
//define(['N/currentRecord','N/record','N/search','N/http','N/xml','N/runtime','/SuiteScripts/OneFM Integration Scripts/OneFM_Lib.js'],
define([
  "N/currentRecord",
  "N/record",
  "N/search",
  "N/http",
  "N/xml",
  "N/runtime",
  "./OneFM_Lib.js",
  "N/https",
], function (currentRecord, record, search, http, xml, runtime, libjs, https) {
  //Begin: customer_page_init functionality
  function customer_page_init(context) {
    try {
      var record = context.currentRecord;
      var contact_role = record.getField({ fieldId: "contactrole" });
      if (nullCheck(contact_role)) {
        contact_role.isDisabled = true;
      }
    } catch (err) {
      log.debug({ title: "err", details: err });
    }
  }
  //End: customer_page_init functionality

  //Begin: customer_field_changed functionality
  function customer_field_changed(context) {
    try {
      var record = context.currentRecord;
      if (
        context.fieldId == "custentity_ofm_contact_roletagged" ||
        context.fieldId == "company"
      ) {
        var role_tagged = record.getValue({
          fieldId: "custentity_ofm_contact_roletagged",
        });
        var customer_id = record.getValue({
          fieldId: "company",
        });
        if (nullCheck(role_tagged) && nullCheck(customer_id)) {
          var contactSearchObj = search.create({
            type: "contact",
            filters: [
              ["company", "anyof", customer_id],
              "AND",
              ["custentity_ofm_contact_roletagged", "anyof", role_tagged],
              "AND",
              ["isinactive", "is", "F"],
            ],
            columns: [],
          });
          var searchResultCount = contactSearchObj.runPaged().count;
          //log.debug("contactSearchObj result count",searchResultCount);
          if (!nullCheck(searchResultCount)) {
            searchResultCount = 0;
          }
          if (searchResultCount > 0) {
            alert("This role is already exist for contact");
            record.setValue({
              fieldId: "custentity_ofm_contact_roletagged",
              value: "",
            });
          }
        }
      }
    } catch (err) {
      log.debug({ title: "err", details: err });
    }
  }
  //End: customer_field_changed functionality

  function CreateContact_OneFM() {
    try {
      //var postURL = 'http://dev.mesonefm.com.sg/api/netsuite/client/contact/create'; // commented hardcode URL
      // var postURL = getURL_fun() + "api/netsuite/client/contact/create"; // getting URL prefix from lib
      var postURL = getURL_fun() + "api/netsuite/client/contact/edit"; // getting URL prefix from lib
      //API for contact Create
      //var postURL = 'http://dev.mesonefm.com.sg/api/netsuite/client/contact/create'; // commented hardcode URL
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
      var currentRec = currentRecord.get();
      //var currentRec = context.currentRecord;
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
        log.debug({
          title: 'phone AR',
          details: phone
        });
        mobile_number = loadRecord.getValue({ fieldId: "mobilephone" }).replace(/^\+65/, "");
        email = loadRecord.getValue({ fieldId: "email" });
        role_id = loadRecord.getValue({ fieldId: "contactrole" });
        // Commented following code on 16-Nov-2021 for role change
        /*if(role_id == -10)
				{
					designation = 'Primary';
					is_primary =true;
				}*/
        // Added following code on 16-Nov-2021 to set new roles.
        if (role_id == 3) {
          designation = "Primary";
          is_primary = true;
        } else if (role_id == 1) {
          designation = "Director In-Charge";
        } else if (role_id == 2) {
          designation = "Operations In-Charge";
        }
        // Added following code on 16-Nov-2021 to set new roles.
        else if (role_id == -10) {
          designation = "Accounts In-Charge";
        }
        //Commented following code on 16-Nov-2021 for role change
        /*else if(role_id == 3)
				{
					designation = 'Accounts In-Charge';
				}
				else{
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
          // netsuite_contact_id: 7942,
          person_name: person_name,
          phone: phone,
          email: email,
          designation: designation,
          is_primary: is_primary,
          mobile: mobile_number,
        };
        log.debug("postarray AR", "postarray :" + JSON.stringify(postarray));

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
          if (response.code == 200) {
            loadRecord.setValue({
              fieldId: "custentity_ofm_contacttransfertoonefm",
              value: true,
            });
          }
        }
        loadRecord.save();
        location.reload();
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

  function nullCheck(value) {
    if (value != null && value != "" && value != undefined) return true;
    else return false;
  }
  return {
    pageInit: customer_page_init,
    fieldChanged: customer_field_changed,
    CreateContact_OneFM: CreateContact_OneFM,
  };
});
