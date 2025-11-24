/*----------------------------------------------------------------------------------------------
		Company Name 	:	Nuvista Technologies Pvt Ltd
		Script Name 	:	OneFM Contract Integration
		Author 			:  	NVT Employee 
		Date            :   08-09-2021 
		Description		:	1. The Script is created for reset password OneFM


------------------------------------------------------------------------------------------------*/

/**
 *@NApiVersion 2.0
 *@NScriptType UserEventScript
 *@NModuleScope Public
 */
//This function is used to add button for reset password

define(['N/config','N/format','N/record','N/url','N/runtime','N/http','N/search'],
  function(config,format,record,url,runtime,http,search) {
	  //Begin: BeforeLoad functionality
	  	function beforeLoadCustomer_OneFM(context,config,format,record,url,runtime,http,search) {
			try {
					//Create button to reset password OneFM.
					if(context.type == "view" )
					{
						var currentRec = context.newRecord;
						var form = context.form; 
						form.addButton({ id: 'custpage_onefm_reset_pass', label: 'OneFM Client Portal Reset Password', functionName: 'reset_onefm_password'});
						//context.form.clientScriptModulePath = 'SuiteScripts/OneFM Integration Scripts/OneFM Customer Password Client.js';   	
						context.form.clientScriptModulePath = './OneFM Customer Password Client.js';   	
					}
			}
			catch(err) {
			log.debug({title: 'err',details: err});	
			if(err.details) {
				return {"statuscode":"406","success":"false", "message":err.details}
			} else if(err.code) {
				return {"statuscode":"407","success":"false", "message":err.code}
			} else if(err.message) {
				return {"statuscode":"408","success":"false", "message":err.message}
			}
		}
		
	}
	//End: BeforeLoad functionality 

    return {
		beforeLoad: beforeLoadCustomer_OneFM
    };
});

function nullCheck(value)
{
	if (value != null && value != '' && value != undefined)
		return true;
	else
		return false;
}
