/**
 *@NApiVersion 2.0
 *@NScriptType Restlet
 *@NModuleScope Public
 */


//Begin : RESTlet Script
//This function is used to create contact master data from MES to NS
define(['N/record', 'N/search', 'N/error'],
	function (record, search, error) {

		function updateContactMaster(dataIn) {
			try {
				//dataIn- From ONeFM, designation, name and etc field receive
				log.debug({ title: 'dataIn', details: JSON.stringify(dataIn) });
				if (nullCheck(dataIn)) {
					var designation = dataIn.designation;
					if (nullCheck(designation)) {
						var subsidiary = dataIn.subsidiary;
						var netsuiteCompanyID = dataIn.netsuite_company_id;
						log.debug({
							title: 'netsuiteCompanyID',
							details: netsuiteCompanyID
						});
						var phone = dataIn.phone;
						log.debug({ title: 'debug phone', details: phone });
						var email = dataIn.email;
						var person_name = dataIn.person_name;

						var mobile_number = dataIn.mobile;
						if (nullCheck(person_name)) {
							var fullName = person_name.split(" ");
							var first_name = fullName[0];
							var middle_name = fullName[1];
							var last_name = '';
							for (var i = 2; i < fullName.length; i++) {
								last_name = last_name + " " + fullName[i];
							}
						}
						var fax = dataIn.fax;
						var is_primary = dataIn.is_primary;
						//Load the exiting Contact record

						var loadRecord = record.create({
							type: record.Type.CONTACT,
							isDynamic: true,
						});
						//log.debug({title: 'loadRecord',details: loadRecord});
						if (nullCheck(person_name)) {
							loadRecord.setValue({ fieldId: 'entityid', value: person_name });
						}
						if (nullCheck(first_name)) {
							loadRecord.setValue({ fieldId: 'firstname', value: first_name });
						}
						if (nullCheck(middle_name)) {
							loadRecord.setValue({ fieldId: 'middlename', value: middle_name });
						}
						if (nullCheck(last_name)) {
							loadRecord.setValue({ fieldId: 'lastname', value: last_name });
						}
						if (nullCheck(email)) {
							loadRecord.setValue({ fieldId: 'email', value: email });
						}
						if (nullCheck(phone)) {
							loadRecord.setValue({ fieldId: 'phone', value: phone });

						}
						if (nullCheck(fax)) {
							loadRecord.setValue({ fieldId: 'fax', value: fax });
						}
						if (nullCheck(mobile_number)) {
							loadRecord.setValue({ fieldId: 'mobilephone', value: mobile_number });
						}
						if (nullCheck(subsidiary)) {
							loadRecord.setValue({ fieldId: 'subsidiary', value: subsidiary });
						}
						if (nullCheck(netsuiteCompanyID)) {
							loadRecord.setValue({ fieldId: 'company', value: netsuiteCompanyID });
						}

						//Commented following code on 16-Nov-2021 because no use of is_primary as of now.
						/*if(is_primary == true)
						{
							loadRecord.setValue({ fieldId: 'contactrole', value: -10 });
							loadRecord.setValue({ fieldId: 'custentity_ofm_contact_roletagged', value: -10 });
							//log.debug({title: 'is_primary',details: is_primary});
						}
						else */
						if (designation == 'Director In-Charge') {
							loadRecord.setValue({ fieldId: 'contactrole', value: 1 });
							loadRecord.setValue({ fieldId: 'custentity_ofm_contact_roletagged', value: -10 });
						}
						else if (designation == 'Operations In-Charge') {
							//loadRecord.setValue({ fieldId: 'contactrole', value: 2 });
							loadRecord.setValue({ fieldId: 'custentity_ofm_contact_roletagged', value: -10 });
						}
						// Commented following code on 16-Nov-2021 for role change
						/*else if(designation == 'Accounts In-Charge')
						{
							loadRecord.setValue({ fieldId: 'contactrole', value: 3 });
							loadRecord.setValue({ fieldId: 'custentity_ofm_contact_roletagged', value: 3 });
						}*/

						// Added following code on 16-Nov-2021 to set new roles.
						else if (designation == 'Accounts In-Charge') {
							loadRecord.setValue({ fieldId: 'contactrole', value: -10 });
							loadRecord.setValue({ fieldId: 'custentity_ofm_contact_roletagged', value: -10 });
						}
						else if (designation == 'Primary') {
							loadRecord.setValue({ fieldId: 'contactrole', value: 3 });
							loadRecord.setValue({ fieldId: 'custentity_ofm_contact_roletagged', value: -10 });
						}
						else { return { "statuscode": "403", "success": "false", "message": 'Designation is not available in NetSuite.Contact record not created' } }
						log.debug('loadRecord', loadRecord);
						var recordId = loadRecord.save({ ignoreMandatoryFields: true, enableSourcing: false });
						log.debug({ title: 'recordId', details: recordId });
						if (nullCheck(recordId)) { return { "statuscode": "200", "success": "true", "message": "Contact record created successfully", "netsuite_contact_id": recordId }; }
					}



				}
				else { return { "statuscode": "405", "success": "false", "message": 'Contact data is Empty.' } }
			}
			catch (err) {
				log.debug({ title: 'err', details: err });
				if (err.details) {
					return { "statuscode": "406", "success": "false", "message": err.details }
				} else if (err.code) {
					return { "statuscode": "407", "success": "false", "message": err.code }
				} else if (err.message) {
					if (err.message == "That record does not exist.")
						return { "statuscode": "408", "success": "false", "message": "Contact not created." }
					else
						return { "statuscode": "408", "success": "false", "message": err.message }
				}
			}

		}
		return {
			post: updateContactMaster
		};
	}
);
//End : This function is used to update employee master data from MES to NS


function nullCheck(value) {
	if (value != null && value != '' && value != undefined)
		return true;
	else
		return false;
}