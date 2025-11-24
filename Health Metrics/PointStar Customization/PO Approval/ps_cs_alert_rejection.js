/** 
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */


define(['N/currentRecord', 'N/record',],
    function(currentRecord, record) {

function saveRecord()
{
  var crec = currentRecord.get();
  var appr = crec.getValue({fieldId: "approval_status"})  
  var rej = crec.getValue({fieldId: "rejection_reason"})
log.debug("vals", appr + " " + rej)
  if(appr == "2" && rej == ""){
alert("Please Enter a rejection reason");
  return false;
  }

  return true;

}

return{
saveRecord : saveRecord,
}

})
