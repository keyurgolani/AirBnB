

function ToCheck(card, exp_month, exp_year, cvv, callback) {
	
	console.log("in tocheck");
	
	var answer = true;
	var message="";
		
	var month = Number(exp_month);
	var year = Number(exp_year);

	console.log(month,year);

	var cc_check = new RegExp("^(?:(4[0-9]{12}(?:[0-9]{3})?)|(5[1-5][0-9]{14})|(6(?:011|5[0-9]{2})[0-9]{12})|(3[47][0-9]{13})|(3(?:0[0-5]|[68][0-9])?[0-9]{11})|((?:2131|1800|35[0-9]{3})[0-9]{11}))$");
	var d = new Date();
	var today_year = d.getFullYear();
	console.log('today_year', today_year);
	var today_month = d.getMonth()+1;
	console.log('today_month', today_month);

	
	
	
//	var exp_check = new RegExp("^((today_year)|(20[1-2][0-9]))\-((0[1-9])|(1[0-2]))$");		
	var cvv_check = new RegExp("^[0-9]{3,4}$");
	
	
//	if(year <= today_year || month <= today_month){
//		console.log("in loop!");	
//	}	
	

	
	if ((card.match(cc_check) === null) || (year < today_year) || (cvv.match(cvv_check) === null)) {

		if ((card.match(cc_check) === null) && (year <= today_year) && (month <= today_month)) {
			message = "Please enter correct details in all the fields";
		} else {
			if (card.match(cc_check) === null) {
				message += "Credit card number is invalid. \n";
			}
			if ((year < today_year) || (year = today_year && month < today_month)) {
				message += "Expiry date of the card number is invalid.\n";
			}
			
			if (cvv.match(cvv_check) === null) {
				message += "CVV number of the credit card is invalid.";
			}
		}
		answer = false;
	}
	callback(answer, message);
}

module.exports.Tocheck = ToCheck;