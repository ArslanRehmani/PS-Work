/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(["N/email", "N/record", "N/render", "N/url", "N/runtime", "N/file", 'N/search'],
 function (email, record, render, url, runtime, file, search) {

  function onAction(context) {
    try {

      var rec = context.newRecord;
      var recId = rec.id; 
      var sub = rec.getValue({fieldId: "subsidiary"});
      log.debug({
        title: "recId",
        details: recId,
      });
      log.debug("Subsidiary", sub);

      var createdBy = rec.getValue({fieldId: "custbody_ps_jecreatedby"})
      var sts = rec.getValue({fieldId: "approvalstatus"})      
      var poSts = rec.getValue({fieldId: "custbody_ps_poapprovalstatus"})
      var rejectReason = rec.getValue({ fieldId: "custbody_ps_vbrejectreason" });
      var amt = rec.getValue({fieldId : "custbody_ps_amtinbasecurrency"});
      var poCat = rec.getValue({fieldId : "custbody_ps_pocategory"});     
      var bud = rec.getValue({fieldId : "custbody_ps_budget"});           
      var docNo = rec.getValue({fieldId : "tranid"});       
      var attachFileId =  rec.getValue({fieldId: "custbody_po_attachment"})
      log.debug("Values", createdBy + " po sts " + poSts + " bud " + bud)


        var arrayAttach = new Array();
        var rendPdf1 = render.transaction({
          entityId: recId,
          printMode: render.PrintMode.PDF,
        });
        log.debug("PDF", rendPdf1);

        arrayAttach.push(rendPdf1);
 
         if(attachFileId)
        {
          var fileObj = file.load({
        id: attachFileId
     });
          log.debug("File Obj", fileObj)
          arrayAttach.push(fileObj)
          log.debug("array", arrayAttach)
        }
      
    //Malaysia  
    if(sub == "1" || sub == "6" || sub == "2")
    { 


     //Pending HOD 
     if (bud == "1" && poSts == "3" && sts != "2") {
        var hod = rec.getValue({fieldId: "custbody_ps_hod"});
       
       if(hod)
       {
          var suiteletUrl = url.resolveScript({
          scriptId: "customscript_ps_sut_po_approval",
          deploymentId: "customdeploy_ps_sut_po_approval",
          params: {
            reject_Reason: rejectReason,
            senderEmail: hod,
          },
          returnExternalUrl: true,
        });  
        suiteletUrl += "&subsidiary=" + sub + "&amount=" + amt + "&recId=" + recId + "&poCat=" + poCat;
        var body =
          "Hi,<br/><br/>" +
          "Purchase Order " + docNo + " is waiting for your approval. Please review the attached document file.<br/><br/>" +
          "To approve or reject this document through this email, Please click the link below" +
          '.<br><br><br><a  href= "' +
          suiteletUrl +
          '">Click Here</a><br><br><br>Thank You."';
      
               var subject = "PO Approval " + docNo + " For HOD Approval";

         
        var toEmail = getEmail(hod);  
        var emailSts =  email.send({
          author: createdBy,
          recipients: toEmail,
          subject: subject ,
          body: body,
          attachments: arrayAttach,
          relatedRecords: {
            transactionId: recId,
          },
        });
       }
      log.debug("EMail", emailSts + " " + poSts)
       
     }
     else if(poSts == "4" && sts != "2")
     {
       log.debug("CEO", poSts)
        var subRec = search.lookupFields({type: "subsidiary", id: sub , columns: ["custrecord_ps_ceo"]});
        subRec = subRec.custrecord_ps_ceo;
        var ceo = subRec[0].value
              log.debug(" sub rec ",  ceo)

       if(ceo)
       {
          var suiteletUrl = url.resolveScript({
          scriptId: "customscript_ps_sut_po_approval",
          deploymentId: "customdeploy_ps_sut_po_approval",
          params: {
            reject_Reason: rejectReason,
            senderEmail: ceo,
          },
          returnExternalUrl: true,
        });  
        suiteletUrl += "&subsidiary=" + sub + "&amount=" + amt + "&recId=" + recId + "&poCat=" + poCat;
        var body =
          "Hi,<br/><br/>" +
          "Purchase Order " + docNo + " is waiting for your approval. Please review the attached document file.<br/><br/>" +
          "To approve or reject this document through this email, Please click the link below" +
          '.<br><br><br><a  href= "' +
          suiteletUrl +
          '">Click Here</a><br><br><br>Thank You."';         
               var subject = "PO Approval " + docNo + " For CEO Approval";

        var toEmail = getEmail(ceo);
       
        var emailSts =  email.send({
          author: createdBy,
          recipients: toEmail,
          subject: subject,
          body: body,
          attachments: arrayAttach,
          relatedRecords: {
            transactionId: recId,
          },
        });
      log.debug("EMail", emailSts + " " + poSts)
       }
     }       
     else if(poSts == "8" && sts != "2")//Pending BOD
     {
        var subRec = search.lookupFields({type: "subsidiary", id: sub , columns: ["custrecord_ps_bodchairman"]});
        subRec = subRec.custrecord_ps_bodchairman;
       var bod = subRec[0].value
              log.debug(" sub rec ",  bod)
       if(bod)
       {
          var suiteletUrl = url.resolveScript({
          scriptId: "customscript_ps_sut_po_approval",
          deploymentId: "customdeploy_ps_sut_po_approval",
          params: {
            reject_Reason: rejectReason,
            senderEmail: bod,
          },
          returnExternalUrl: true,
        });  
        suiteletUrl += "&subsidiary=" + sub + "&amount=" + amt + "&recId=" + recId + "&poCat=" + poCat;
        var body =
          "Hi,<br/><br/>" +
          "Purchase Order " + docNo + " is waiting for your approval. Please review the attached document file.<br/><br/>" +
          "To approve or reject this document through this email, Please click the link below" +
          '.<br><br><br><a  href= "' +
          suiteletUrl +
          '">Click Here</a><br><br><br>Thank You."';         
               var subject = "PO Approval " + docNo + " For BOD Approval";

        var toEmail = getEmail(bod);
       
        var emailSts =  email.send({
          author: createdBy,
          recipients: toEmail,
          subject: subject,
          body: body,
          attachments: arrayAttach,
          relatedRecords: {
            transactionId: recId,
          },
        });
      log.debug("EMail", emailSts + " " + poSts)
       }
     }      
    }


//Singapore      
    if(sub == "4")
    {
       
     //Pending HOD 
     if (poSts == "3" && sts != "2") {
       
        var hod = rec.getValue({fieldId: "custbody_ps_hod"});
       if(hod)
       {
          var suiteletUrl = url.resolveScript({
          scriptId: "customscript_ps_sut_po_approval",
          deploymentId: "customdeploy_ps_sut_po_approval",
          params: {
            reject_Reason: rejectReason,
            senderEmail: hod,
          },
          returnExternalUrl: true,
        });  
        suiteletUrl += "&subsidiary=" + sub + "&amount=" + amt + "&recId=" + recId + "&poCat=" + poCat;
        var body =
          "Hi,<br/><br/>" +
          "Purchase Order " + docNo + " is waiting for your approval. Please review the attached document file.<br/><br/>" +
          "To approve or reject this document through this email, Please click the link below" +
          '.<br><br><br><a  href= "' +
          suiteletUrl +
          '">Click Here</a><br><br><br>Thank You."';         
      var subject = "PO Approval " + docNo + " For HOD Approval";
         
        var toEmail = getEmail(hod);
        var emailSts =  email.send({
          author: createdBy,
          recipients: toEmail,
          subject: subject,
          body: body,
          attachments: arrayAttach,
          relatedRecords: {
            transactionId: recId,
          },
        });
      log.debug("EMail", emailSts + " " + poSts)
     }
     }
     else if(poSts == "4" && sts != "2")//Pending CEO
     {
        var subRec = search.lookupFields({type: "subsidiary", id: sub , columns: ["custrecord_ps_ceo"]});
        subRec = subRec.custrecord_ps_ceo;
        var ceo = subRec[0].value
        log.debug(" sub rec ",  ceo)

       if(ceo)
       {
          var suiteletUrl = url.resolveScript({
          scriptId: "customscript_ps_sut_po_approval",
          deploymentId: "customdeploy_ps_sut_po_approval",
          params: {
            reject_Reason: rejectReason,
            senderEmail: ceo,
          },
          returnExternalUrl: true,
        });  
        suiteletUrl += "&subsidiary=" + sub + "&amount=" + amt + "&recId=" + recId + "&poCat=" + poCat;
        var body =
          "Hi,<br/><br/>" +
          "Purchase Order " + docNo + " is waiting for your approval. Please review the attached document file.<br/><br/>" +
          "To approve or reject this document through this email, Please click the link below" +
          '.<br><br><br><a  href= "' +
          suiteletUrl +
          '">Click Here</a><br><br><br>Thank You."';

         
      var subject = "PO Approval " + docNo + " For CEO Approval";
         
        var toEmail = getEmail(ceo);
       
        var emailSts =  email.send({
          author: createdBy,
          recipients: toEmail,
          subject: subject,
          body: body,
          attachments: arrayAttach,
          relatedRecords: {
            transactionId: recId,
          },
        });
      log.debug("EMail", emailSts + " " + poSts)
       }
     }

      
    }
//Indonesia
    if(sub == "5")
    {     
      
     //Pending VP Finance 
     if (poSts == "9" && sts != "2") {
        var hod = rec.getValue({fieldId: "custbody_ps_hod"});
       if(hod)
       {

          var suiteletUrl = url.resolveScript({
          scriptId: "customscript_ps_sut_po_approval",
          deploymentId: "customdeploy_ps_sut_po_approval",
          params: {
            reject_Reason: rejectReason,
            senderEmail: hod,
          },
          returnExternalUrl: true,
        });  
        suiteletUrl += "&subsidiary=" + sub + "&amount=" + amt + "&recId=" + recId + "&poCat=" + poCat;
        var body =
          "Hi,<br/><br/>" +
          "Purchase Order " + docNo + " is waiting for your approval. Please review the attached document file.<br/><br/>" +
          "To approve or reject this document through this email, Please click the link below" +
          '.<br><br><br><a  href= "' +
          suiteletUrl +
          '">Click Here</a><br><br><br>Thank You."';
         
      var subject = "PO Approval " + docNo + " For VP Finance Approval";      
         
        var toEmail = getEmail(hod);
        var emailSts =  email.send({
          author: createdBy,
          recipients: toEmail,
          subject: subject,
          body: body,
          attachments: arrayAttach,
          relatedRecords: {
            transactionId: recId,
          },
        });
      log.debug("EMail", emailSts + " " + poSts)
       }
       
     }
     else if(poSts == "4" && sts != "2")//Pending CEO
     {
        var subRec = search.lookupFields({type: "subsidiary", id: sub , columns: ["custrecord_ps_ceo"]});
        subRec = subRec.custrecord_ps_ceo;
        var ceo = subRec[0].value
        log.debug(" sub rec ",  ceo)

       if(ceo)
       {

          var suiteletUrl = url.resolveScript({
          scriptId: "customscript_ps_sut_po_approval",
          deploymentId: "customdeploy_ps_sut_po_approval",
          params: {
            reject_Reason: rejectReason,
            senderEmail: ceo,
          },
          returnExternalUrl: true,
        });  
        suiteletUrl += "&subsidiary=" + sub + "&amount=" + amt + "&recId=" + recId + "&poCat=" + poCat;
        var body =
          "Hi,<br/><br/>" +
          "Purchase Order " + docNo + " is waiting for your approval. Please review the attached document file.<br/><br/>" +
          "To approve or reject this document through this email, Please click the link below" +
          '.<br><br><br><a  href= "' +
          suiteletUrl +
          '">Click Here</a><br><br><br>Thank You."';

         
      var subject = "PO Approval " + docNo + " For CEO Approval";      
         
        var toEmail = getEmail(ceo);
       
        var emailSts =  email.send({
          author: createdBy,
          recipients: toEmail,
          subject: subject,
          body: body,
          attachments: arrayAttach,
          relatedRecords: {
            transactionId: recId,
          },
        });
      log.debug("EMail", emailSts + " " + poSts)
       }
     }
    }
    

      }
     catch (ex) {
         log.debug("Err", ex + " " + ex.name)
    }
  }

  

  function getCreatedBy(recId) {
    var currentUser = runtime.getCurrentUser();

    log.debug("createdby", currentUser.id);
    return currentUser.id;
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
    onAction: onAction,
  };
});
