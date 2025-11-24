/**
 *@NApiVersion 2.0
 *@NScriptType Restlet
 *@NModuleScope Public
 */
 

//Begin : RESTlet Script
//This function is used to update contact master data from MES to NS
define(['N/record','N/search','N/error'],
  function(record,search,error) {

    function updateContactMaster(dataIn) {
		try {
			//dataIn- From ONeFM, designation, name and etc field receive
				log.debug({title: 'dataIn',details: JSON.stringify(dataIn)});	
				if(nullCheck(dataIn))
				{
					var contact_id = dataIn.contactid;
					if(nullCheck(contact_id))
					{
						var designation = dataIn.designation;
						if(nullCheck(designation) )
						{
							var phone = dataIn.phone;
							log.debug({title: 'debug',details: phone});
							var email = dataIn.email;
							var person_name = dataIn.person_name;
							
							var mobile_number = dataIn.mobilephone;
							if(nullCheck(person_name)){
									var fullName= person_name.split(" ");
									var first_name = fullName[0];
									var middle_name = fullName[1];
									var last_name ='';
									for(var i=2;i<fullName.length;i++)
									{
										last_name = last_name+ " " +fullName[i];
									}
							}
							var fax = dataIn.fax;
							var is_primary = dataIn.is_primary;
								//Load the exiting Contact record

								var loadRecord = record.load({
									type: record.Type.CONTACT, 
									id: contact_id,
									isDynamic: true,
								});
								//log.debug({title: 'loadRecord',details: loadRecord});
								//if(nullCheck(person_name)){
								loadRecord.setValue({ fieldId: 'entityid', value: person_name });
								//}
								//if(nullCheck(first_name)){
								loadRecord.setValue({ fieldId: 'firstname', value: first_name });
								//}
								//if(nullCheck(middle_name)){
								loadRecord.setValue({ fieldId: 'middlename', value: middle_name });
								//}
								//if(nullCheck(last_name)){
								loadRecord.setValue({ fieldId: 'lastname', value: last_name });
								//}
								//if(nullCheck(email)){
								loadRecord.setValue({ fieldId: 'email', value: email });
								//}	
								//if(nullCheck(phone)){
								loadRecord.setValue({ fieldId: 'phone', value: phone });
								//}
								//if(nullCheck(fax)){
								loadRecord.setValue({ fieldId: 'fax', value: fax });
								//}
								//if(nullCheck(mobile_number)){
								loadRecord.setValue({ fieldId:'mobilephone', value: mobile_number });
								//}
								
								if(is_primary == true)
								{
									loadRecord.setValue({ fieldId: 'contactrole', value: -10 });
                                    loadRecord.setValue({ fieldId: 'custentity_ofm_contact_roletagged', value: -10 });
									//log.debug({title: 'is_primary',details: is_primary});
								}
								else if(designation == 'Director In-Charge')
								{
									loadRecord.setValue({ fieldId: 'contactrole', value: 1 });
                                    loadRecord.setValue({ fieldId: 'custentity_ofm_contact_roletagged', value: 1 });
								}
								else if(designation == 'Operations In-Charge')
								{
									loadRecord.setValue({ fieldId: 'contactrole', value: 2});
                                    loadRecord.setValue({ fieldId: 'custentity_ofm_contact_roletagged', value: 2 });
								}
								else if(designation == 'Accounts In-Charge')
								{
									loadRecord.setValue({ fieldId: 'contactrole', value: 3 });
                                    loadRecord.setValue({ fieldId: 'custentity_ofm_contact_roletagged', value: 3 });
								}
								else  
								{ return {"statuscode":"403","success":"false", "message":'Designation is not available in NetSuite.Contact record not updated'}}
								
								var recordId = loadRecord.save();
								log.debug({title: 'recordId',details: recordId});	
								if(nullCheck(recordId)){return {"statuscode":"200", "success":"true", "message": "Contact record updated successfully"};}
						}
						//else { return {"statuscode":"402","success":"false", "message":'Designation field is mandatory.'}}
					}
					else { return {"statuscode":"404","success":"false", "message":'Contact internal id is empty.'}}
				}
				else { return {"statuscode":"405","success":"false", "message":'Contact data is Empty.'}}
		}
		catch(err) {
		log.debug({title: 'err',details: err});	
		if(err.details) {
			return {"statuscode":"406","success":"false", "message":err.details}
		} else if(err.code) {
			return {"statuscode":"407","success":"false", "message":err.code}
		} else if(err.message) {
			if(err.message == "That record does not exist.")
			return {"statuscode":"408","success":"false", "message":"Contact Record ID "+contact_id+" is not present in NetSuite."}
			else
			return {"statuscode":"408","success":"false", "message":err.message}
		}
	}
	
    }
    return {
      post : updateContactMaster
    };
  }
);
//End : This function is used to update employee master data from MES to NS


function nullCheck(value)
{
	if (value != null && value != '' && value != undefined)
		return true;
	else
		return false;
}