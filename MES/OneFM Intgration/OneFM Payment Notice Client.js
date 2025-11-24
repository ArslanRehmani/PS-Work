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
  "N/runtime",
  "./OneFM_Lib.js",
  "N/https",
], function (currentRecord, record, search, http, xml, runtime, libjs, https) {
  function pageInit(context) {
    if (context.mode == "copy") {
      //comment - edit end of the development
      var record = currentRecord.get();
      record.setValue({
        fieldId: "custbody_ofm_invoicetransfer",
        value: false,
      });
      record.setValue({
        fieldId: "custbody_ofm_invoicetransfered_create",
        value: "",
      });
    }
  }

  //If Approve button click the Send to OneFM (This is handled with STD approve and event type on DEployment of script, so no any condition require in coding.)
  function approvedInvoice_OneFM() {
    try {
      alert("Invoice transferring to OneFM");

      //Begin: Post URL and Header Object
      //var postURL = "http://dev.mesonefm.com.sg/api/netsuite/payment/notice/mark/billed";
      //var postURL = "http://dev.mesonefm.com.sg/api/netsuite/payment/notice/mark/billed";
      // var postURL = 'https://www.mesonefm.com.sg/api/netsuite/payment/notice/mark/billed';
      var postURL =
        "https://staging.one-fm.com.sg/api/netsuite/payment/notice/mark/billed";
      //var postURL = getURL_fun() + "api/netsuite/payment/notice/mark/billed";
      log.debug("postURL", postURL);
      log.debug({ title: "postURL", details: postURL });
      var headerObj = getHeaderObject();
      log.debug({ title: "headerObj", details: JSON.stringify(headerObj) });
      //End:Post URL and Header Object

      //Begin: Variable declaration
      var payment_notice_id = "",
        payment_notice_type = "",
        service_request_id = "",
        payment_notice_number = "";
      //End: '',iable declaration

      //Begin:Getting field details from Invoice
      var currentRec = currentRecord.get();
      if (nullCheck(currentRec)) {
        //If record is created then only all validation will work
        var loadRecord = record.load({
          type: currentRec.type,
          id: currentRec.id,
          isDynamic: true,
        });

        payment_notice_id = loadRecord.getValue({
          fieldId: "custbody_ofm_invoice_paymentnoticeid",
        });
        payment_notice_number = loadRecord.getValue({
          fieldId: "custbody_ofm_inv_paynoticenumfromofm",
        });
        payment_notice_type = loadRecord.getValue({
          fieldId: "custbody_ofm_invoice_paymentnoticetype",
        });
        service_request_id = loadRecord.getValue({
          fieldId: "custbody_ofm_invoice_servicerequestid",
        });

        var billedby = runtime.getCurrentUser().name;

        if (nullCheck(payment_notice_id) && nullCheck(payment_notice_number)) {
          //Begin: Prepare Array to send to OneFM in Post method
          var postarray = {
            payment_notice_id: payment_notice_id,
            payment_notice_type: payment_notice_type,
            service_request_id: service_request_id,
            billed_by: billedby,
          };
          log.debug("postarray", "postarray :" + JSON.stringify(postarray));
          //alert('url:.. '+postURL)
          //alert('postarray :'+JSON.stringify(postarray))
          /*var response = http.post({
					url: postURL,
					body: JSON.stringify(postarray),
					headers: headerObj
				});*/
          var response = https.post({
            url: postURL,
            body: JSON.stringify(postarray),
            headers: headerObj,
          });
          //alert('response.:'+response)
          //loadRecord.setValue({fieldId: 'custbody_ofm_onefmrequestfield', value: JSON.stringify(postarray)});
          loadRecord.setValue({
            fieldId: "custbody_ofm_reqforinvoicefld",
            value: JSON.stringify(postarray),
          });

          if (nullCheck(response)) {
            log.debug(
              "PostMethod",
              "response Code:" +
                response.code +
                "response body:" +
                response.body
            );
            var oneFmResponse =
              "Response Code : " +
              response.code +
              " Response Body : " +
              response.body;
            //alert(oneFmResponse);

            //loadRecord.setValue({fieldId: 'custbody_ofm_contractcreate_response', value: oneFmResponse});
            loadRecord.setValue({
              fieldId: "custbody_ofm_invoicetransfered_create",
              value: oneFmResponse,
            });
            if (response.code == 200)
              //loadRecord.setValue({fieldId: 'custbody_ofm_contracttransfered_create', value: true});
              loadRecord.setValue({
                fieldId: "custbody_ofm_invoicetransfer",
                value: true,
              });
          }
          loadRecord.save();
          location.reload();
        } else {
          log.debug(
            "nullCheck",
            "PAYMENT NOTICE NUMBER FROM OFM or PAYMENT NOTICE ID blank"
          );
        }
      }
    } catch (err) {
      alert(err);
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

  function formatDate(dateValue) {
    var finalDate;

    var monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    var date = dateValue.getDate();
    if (date < 10) date = "0" + date;
    var Month = monthNames[dateValue.getMonth()];
    var Year = dateValue.getFullYear();
    finalDate = date + " " + Month + " " + Year;

    return finalDate;
  }

  return {
    pageInit: pageInit,
    approvedInvoice_OneFM: approvedInvoice_OneFM,
  };
});
