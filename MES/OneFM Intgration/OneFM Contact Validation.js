/**
        *@NApiVersion 2.x
        *@NScriptType ClientScript
        */

define(['N/currentRecord','N/record'], function (currentRecord,record) {
	
    function customer_validate_insert(context) {
		//if(context.mode == "create" )
		{ 
			var record =context.currentRecord;
			var currentRec = currentRecord.get();
			var sublistName = context.sublistId;
			
			if(sublistName=='contact')
			{
				var line_count = currentRec.getLineCount({
					sublistId: 'contact'
				});
				log.debug({
					title: 'line_count',
					details: line_count
				});
				var currIndex = currentRec.getCurrentSublistIndex({
					sublistId: 'contact'
				});
			
		
				var contact_role= record.getCurrentSublistValue({sublistId:'contact',fieldId: 'contactrole'});
				if(nullCheck(contact_role)){
					for (var contact_line = 0; contact_line < line_count; contact_line++) {
						if (contact_line != currIndex) {
							// var contact_role_id = record.getSublistValue({ sublistId: 'contact', ,fieldId: 'contactrole',line: contact_line});
							var contact_role_id = record.getSublistValue({
								sublistId: 'contact',
								fieldId: 'contactrole',
								line: contact_line
							}); 
							if (contact_role == contact_role_id) {
								alert('Role must be unique');
								return false;
							}
						}

					}
					var contact_email= record.getCurrentSublistValue({sublistId:'contact',fieldId: 'email'});
					if(nullCheck(contact_email)){
						if(contact_role=='-10'){
							record.setValue(({fieldId: 'email', value: contact_email}));
						}	
						else if(contact_role=='3'){
							record.setValue(({fieldId: 'custentity_ofm_cus_emailidaccountsinchar', value: contact_email}));
						}
						else if(contact_role=='2'){
							record.setValue(({fieldId: 'custentity_ofm_cus_emailopsincharge', value: contact_email}));
						}
						else if(contact_role=='1'){
							record.setValue(({fieldId: 'custentity_ofm_customer_emailiddirect', value: contact_email}));
						}
					}
					return true;
				}
				else{
					alert('Role is mandatory');
					return false;
				}
				return true;
			}
			return true;
		}
	}
	function customer_validate_delete(context) {
		var record =context.currentRecord;
		var sublistName = context.sublistId;
		if(sublistName=='contact'){
			var contact_role= record.getCurrentSublistValue({sublistId:'contact',fieldId: 'contactrole'});
			if(nullCheck(contact_role)){
				if(contact_role=='-10'){
					record.setValue(({fieldId: 'email', value: ''}));
				}	
				else if(contact_role=='3'){
					record.setValue(({fieldId: 'custentity_ofm_cus_emailidaccountsinchar', value: ''}));
				}
				else if(contact_role=='2'){
					record.setValue(({fieldId: 'custentity_ofm_cus_emailopsincharge', value: ''}));
				}
				else if(contact_role=='1'){
					record.setValue(({fieldId: 'custentity_ofm_customer_emailiddirect', value: ''}));
				}
				return true;
			}
			return true;	
		}
		return true;			
	}
	function nullCheck(value){
		if (value != null && value != '' && value != undefined)
			return true;
		else
			return false;
	}
    return {
		validateLine:customer_validate_insert, 
		validateDelete:customer_validate_delete
    }
});
	   


