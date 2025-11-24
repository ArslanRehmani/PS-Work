/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define([
  "N/email",
  "N/record",
  "N/search",
  "N/ui/serverWidget",
  "N/render",
  "N/format",
  "N/url",
  "N/log",
], /**
 * @param {email} email
 * @param {record} record
 * @param {search} search
 * @param {serverWidget} serverWidget
 */ function (email, record, search, serverWidget, render, format, url, log) {
  /**
   * Definition of the Suitelet script trigger point.
   *
   * @param {Object} context
   * @param {ServerRequest} context.request - Encapsulation of the incoming request
   * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
   * @Since 2015.2
   */
  function onRequest(context) {
    var form = serverWidget.createForm({
      title: "Approval Form",
    });

    if (context.request.method == "GET") {

      var approval_status = form.addField({
        id: "approval_status",
        type: serverWidget.FieldType.SELECT,
        label: "Approval Action",
      });

      approval_status.addSelectOption({
        value: "1",
        text: "Approve",
      });
      approval_status.addSelectOption({
        value: "2",
        text: "Reject",
      });

      var rejection_reason = form.addField({
        id: "rejection_reason",
        type: serverWidget.FieldType.TEXTAREA,
        label: "Rejection Reason",
      });

      var sender_email = form.addField({
        id: "sender_email",
        type: serverWidget.FieldType.TEXTAREA,
        label: "Sender Email",
      });
      sender_email.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.HIDDEN,
      });      
      var rec_id = form.addField({
        id: "rec_id",
        type: serverWidget.FieldType.TEXT,
        label: " ",
      });
      rec_id.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.HIDDEN,
      });

      var sub = form.addField({
        id: "sub",
        type: serverWidget.FieldType.TEXT,
        label: " ",
      });
      sub.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.HIDDEN,
      });      

      var amt = form.addField({
        id: "amt",
        type: serverWidget.FieldType.TEXT,
        label: " ",
      });
      amt.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.HIDDEN,
      });   
      var pocat = form.addField({
        id: "pocat",
        type: serverWidget.FieldType.TEXT,
        label: " ",
      });
      pocat.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.HIDDEN,
      });         

      form.clientScriptModulePath = './ps_cs_alert_rejection.js';

      form.addSubmitButton({
        label: "Submit",
      });

      rec_id.defaultValue = context.request.parameters.recId;
      rejection_reason.defaultValue = context.request.parameters.reject_Reason;
      sender_email.defaultValue = context.request.parameters.senderEmail;      
      sub.defaultValue = context.request.parameters.subsidiary;
      amt.defaultValue = context.request.parameters.amount;      
      pocat.defaultValue = context.request.parameters.pocat;            
      log.debug("sender", context.request.parameters.senderEmail)

    } else {
      log.debug("inside post");
      var rec_id = context.request.parameters.rec_id;
      var approval_status = context.request.parameters.approval_status;
      var rejection_reason = context.request.parameters.rejection_reason;
      var subId = context.request.parameters.sub;      
      var amount = context.request.parameters.amt;            
      var po_cat =  context.request.parameters.pocat;     
      var senderEmail =  context.request.parameters.sender_email;           

      log.debug({
        title: "recId",
        details: rec_id,
      });

      log.debug({
        title: "approval_status",
        details: approval_status,
      });
      log.debug({
        title: "rejection_reason",
        details: rejection_reason,
      });
      log.debug({
        title: "sub Id",
        details: subId,
      });  
      log.debug({
        title: "AMount",
        details: amount,
      });     
            log.debug({
        title: "sender email",
        details: senderEmail,
      });     


        var output = "";
      if(approval_status == "1")
      {
        updateRecord(rec_id, approval_status, rejection_reason, subId, amount, po_cat)
              output = "Record has been approved.";
         // var poRec = search.lookupFields({type:"purchaseorder", id: rec_id, columns:["custbody_ps_poapprovalstatus","tranid"]});
         // var sts = poRec.custbody_ps_poapprovalstatus;
         // sts = poRec[0].value;
         // var docNo = poRec.tranid;

            var poUrl = url.resolveRecord({
                recordType: "purchaseorder",
                recordId: rec_id,
                isEditMode: false 
            });        
         var poRec = record.load({type: "purchaseorder", id: rec_id});
        var docNo = poRec.getValue({fieldId: "tranid"});      
        var sts = poRec.getValue({fieldId: "custbody_ps_poapprovalstatus"});      
         log.debug("APPROVED aFTER sts"," docu " + docNo+ " sts " + sts )
        if(sts == "5")
        {
        var body = "Dear Concern,<br/><br/>" 
            body += "Your Purchase Order "+ docNo +" has being approved.<br/><br/>"
            body += '<a href="' + poUrl + '" >View Record</a><br/><br/>'
            body += "Thank You."
        var subj = "Purchase Order # " + docNo + " has being Approved";
       var created  = poRec.getValue({fieldId: "custbody_ps_jecreatedby"});       
        var rece = getEmail(created)
      email.send({
          author: senderEmail,
          recipients: rece,
          subject: subj,
          body: body,
      })
        }
      }
      else
      {
        updateRecord(rec_id, approval_status, rejection_reason, subId, amount, po_cat)   
        output = "Record has been Rejected.";

        var poRec = record.load({type: "purchaseorder", id: rec_id});
        var docNo = poRec.getValue({fieldId: "tranid"});

            var poUrl = url.resolveRecord({
                recordType: "purchaseorder",
                recordId: rec_id,
                isEditMode: false 
            });
      var created  = poRec.getValue({fieldId: "custbody_ps_jecreatedby"});
      var subj = "Purchase Order # "+ docNo + " has being rejected"
      var body = 'Dear Concern,<br/><br/>';
         body += 'Your Purchase Order ' + docNo + ' has being rejected.<br/>';
         body += 'Reason: ' + rejection_reason +' ';
         body +=  '<br/><br/>Please review and take necessary action.<br/><br/>';
         body += '<a href="' + poUrl + '">View Record</a><br/><br/>' ;
         body += 'Thank You.'
        log.debug("body", body + " send " + senderEmail + " rece " + rece)

        var rece = getEmail(created)
      email.send({
          author: senderEmail,
          recipients: rece,
          subject: subj,
          body: body,
      })
       
      }

      var success_msg = form.addField({
        id: "user_id",
        type: serverWidget.FieldType.TEXT,
        label: output,
      });
      success_msg.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.INLINE,
      });
    }

    context.response.writePage(form);
  }

  function updateRecord(rec_id, approval_status, rejection_reason, subId, amount, po_cat) {
    try {
      log.debug("Update");
      var rec = record.load({ type: "purchaseorder", id: rec_id });
      var poSts = rec.getValue({fieldId: "custbody_ps_poapprovalstatus"})

      if(subId == "1" || subId == "6" || subId == "2")
      {
      //Pending HOD 
      if (poSts == 3) {
        if (approval_status == "1") {
          rec.setValue({ fieldId: "custbody_ps_poapprovalstatus", value: 11 });
        }
        if (approval_status == "2") {
          rec.setValue({ fieldId: "custbody_ps_poapprovalstatus", value: 6 });
          rec.setValue({ fieldId: "custbody_ps_vbrejectreason", value: rejection_reason });
        }
      }
      //Pending CEO  
      else if (poSts == 4) {
        if (approval_status == "1") {
          rec.setValue({ fieldId: "custbody_ps_poapprovalstatus", value: 12 });
        }
        if (approval_status == "2") {
          rec.setValue({ fieldId: "custbody_ps_poapprovalstatus", value: 6 });
          rec.setValue({ fieldId: "custbody_ps_vbrejectreason", value: rejection_reason });
        }
      }
     //Pending BOD   
     else if (poSts == 8) {
        if (approval_status == "1") {
          rec.setValue({ fieldId: "custbody_ps_poapprovalstatus", value: 13 });
        }
        if (approval_status == "2") {
          rec.setValue({ fieldId: "custbody_ps_poapprovalstatus", value: 6 });
          rec.setValue({ fieldId: "custbody_ps_vbrejectreason", value: rejection_reason });
        }
      }        
      }
//Singapore
      if(subId == "4")
      {
      //Pending HOD  
      if (poSts == 3) {
        if (approval_status == "1") {
          rec.setValue({ fieldId: "custbody_ps_poapprovalstatus", value: 11 });
        }
        if (approval_status == "2") {
          rec.setValue({ fieldId: "custbody_ps_poapprovalstatus", value: 6 });
          rec.setValue({ fieldId: "custbody_ps_vbrejectreason", value: rejection_reason });
        }
      }
      //Pending CEO  
      if (poSts == 4) {
        if (approval_status == "1") {
          rec.setValue({ fieldId: "custbody_ps_poapprovalstatus", value: 12 });
        }
        if (approval_status == "2") {
          rec.setValue({ fieldId: "custbody_ps_poapprovalstatus", value: 6 });
          rec.setValue({ fieldId: "custbody_ps_vbrejectreason", value: rejection_reason });
        }
      }        
      } 
//Indonesia
      if(subId == "5")
      {
      //Pending VP Finance  
      if (poSts == 9) {
        if (approval_status == "1") {
          rec.setValue({ fieldId: "custbody_ps_poapprovalstatus", value: 14 });
        }
        if (approval_status == "2") {
          rec.setValue({ fieldId: "custbody_ps_poapprovalstatus", value: 6 });
          rec.setValue({ fieldId: "custbody_ps_vbrejectreason", value: rejection_reason });
        }
      }
      //Pending CEO  
      if (poSts == 4) {
        if (approval_status == "1") {
          rec.setValue({ fieldId: "custbody_ps_poapprovalstatus", value: 12 });
        }
        if (approval_status == "2") {
          rec.setValue({ fieldId: "custbody_ps_poapprovalstatus", value: 6 });
          rec.setValue({ fieldId: "custbody_ps_vbrejectreason", value: rejection_reason });
        }
      }        
      }       
      
      rec.save();
      

    } catch (error) {
      log.debug("Err", error);
    }
  }

   function getEmail(id) {
    log.debug("EMAIL function");
    try {
      if (id) {
        var employeeRec = record.load({
          id: id,
          type: "employee",
        });
        var emailField = employeeRec.getValue({
          fieldId: "email",
        });
        return emailField;
      }
    } catch (ex) {
      log.error({
        title: "error in getEmail",
        details: ex.message,
      });
    }
   }
  
  return {
    onRequest: onRequest,
  };
});
