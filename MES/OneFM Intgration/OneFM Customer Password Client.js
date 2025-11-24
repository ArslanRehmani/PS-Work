/*----------------------------------------------------------------------------------------------
    Company Name 	:	Nuvista Technologies Pvt Ltd
    Script Name 	:	OneFM Contract Integration
    Author 			:  	NVT Employee 
    Date            :   08-09-2021 
    Description		:	1. The Script is created for reset password OneFM


------------------------------------------------------------------------------------------------*/

/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

define([
  "N/currentRecord",
  "N/record",
  "N/search",
  "N/http",
  "N/xml",
  "./OneFM_Lib.js",
  "N/https",
  "N/log",
], function (currentRecord, record, search, http, xml, libjs, https, log) {
  function pageInit(context) {
    if (context.mode == "copy") {
      //comment - edit end of the development
      var record = currentRecord.get();
      record.setValue({
        fieldId: "custbody_ofm_contracttransfered_create",
        value: false,
      });
      record.setValue({
        fieldId: "custbody_ofm_contractcreate_response",
        value: "",
      });
    }
  }

  function reset_onefm_password() {
    try {
      alert("Password reset start");
      log.debug("TEST", "TEST");

      //Begin: Post URL and Header Object
      //var postURL = 'http://dev.mesonefm.com.sg/api/netsuite/client/reset/password';
      //   var postURL =
      //     "http://staging.one-fm.com.sg/api/netsuite/client/reset/password";
      var postURL = getURL_fun() + "api/netsuite/client/reset/password";
      log.debug("postURL", postURL);
      var headerObj = getHeaderObject();
      //End:Post URL and Header Object
      //Begin:Getting field details from Customer
      var currentRec = currentRecord.get();
      if (nullCheck(currentRec)) {
        //If record is created then only all validation will work
        var loadRecord = record.load({
          type: "customer",
          id: currentRec.id,
          isDynamic: true,
        });
        var email = loadRecord.getValue({ fieldId: 'email' });

        var customer_id = currentRec.id; //loadRecord.getValue({fieldId: 'entity'});
        //Do EscapeXML for string data and then preapare POst array to send
        //customer_id	=xml.escape({xmlText : customer_id});
        //Begin: Prepare Array to send to OneFM in Post method
        // var postarray = {
        //   client_id: customer_id,
        // };
        var postarray = {
          client_id: customer_id,
          email: email // Optional – email to send reset link
          // newPassword: "StrongPass@123" // Optional – if directly setting password
        };
        log.debug("postarray", "postarray :" + JSON.stringify(postarray));
        var response = https.post({
          url: postURL,
          body: JSON.stringify(postarray),
          headers: headerObj,
        });
        //loadRecord.setValue({fieldId: 'custbody_ofm_onefmrequestfield', value: JSON.stringify(postarray)});
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
          //loadRecord.setValue({fieldId: 'custbody_ofm_contractcreate_response', value: oneFmResponse});
          if (response.code == 200) {
            //loadRecord.setValue({fieldId: 'custbody_ofm_contracttransfered_create', value: true});
            alert(
              "▬▬ Password Reset to OneFM. ▬▬\n\n response Code:\n" +
              response.code +
              "\n response body:" +
              response.body
            );
          } else {
            alert(
              "▬    Password  Not Reset to OneFM.  ▬\n response Code:" +
              response.code +
              "\n response body:" +
              response.body +
              ""
            );
          }
        }
        loadRecord.save();
        location.reload();
      }
      //End: Prepare Post data to send to OneFM in Post method
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

  return {
    pageInit: pageInit,
    reset_onefm_password: reset_onefm_password,
  };
});
