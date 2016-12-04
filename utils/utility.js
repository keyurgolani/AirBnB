module.exports = {
	generateReceiptNo : function(length) {
		var generatedString = "";
		var possible = "0123456789";
		for (var i = 0; i < length; i++) {
			generatedString += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return generatedString;
	},
	generateConfirmationCode : function(length) {
		var generatedString = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		for (var i = 0; i < length; i++) {
			generatedString += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return generatedString;
	},
	formatBillDate : function(date) {
		return require('fecha').format(new Date(date), 'ddd, MMMM DD, YYYY');
	},
	formatStayDate : function(date) {
		return require('fecha').format(new Date(date), 'ddd, MMMM DD, YYYY HH:mm A');
	},
	getCardDetails : function(cardNumber) {
		var returnString          = "";
		var cardNumberString      = String(cardNumber);
		var visaElectronCardRE    = new RegExp("^(?:(?:2131|1800|35\d{3})\d{11})$");
		var americanExpressCardRE = new RegExp("^(?:3[47][0-9]{13})$");
		var dinersCardRE          = new RegExp("^(?:3(?:0[0-5]|[68][0-9])[0-9]{11})$");
		var visaCardRE            = new RegExp("^(?:4[0-9]{12}(?:[0-9]{3})?)$");
		var masterCardRE          = new RegExp("^(?:5[1-5][0-9]{14})$");
		var discoverCardRE        = new RegExp("^(?:6(?:011|5[0-9][0-9])[0-9]{12})$");
	    if(cardNumberString.match(visaElectronCardRE) !== null) {
	    	returnString = returnString + "Visa Electron Card ";
	    } else if(cardNumberString.match(americanExpressCardRE) !== null) {
	    	returnString = returnString + "American Express ";
	    } else if(cardNumberString.match(dinersCardRE) !== null) {
	    	returnString = returnString + "Diner's Card ";
	    } else if(cardNumberString.match(visaCardRE) !== null) {
	    	returnString = returnString + "Visa ";
	    } else if(cardNumberString.match(masterCardRE) !== null) {
	    	returnString = returnString + "Mastercard ";
	    } else if(cardNumberString.match(discoverCardRE) !== null) {
	    	returnString = returnString + "Discover ";
	    }
	    for(var i = 0; i < cardNumberString.length - 4; i++) {
	    	returnString = returnString + 'X';
	    }
	    returnString = returnString + cardNumberString.substr(cardNumberString.length - 4);
	    return returnString;
	},
	maskCard : function(cardNumber) {
		var returnString = "";
		var cardNumberString = String(cardNumber);
	    for(var i = 0; i < cardNumberString.length - 4; i++) {
	    	returnString = returnString + 'X';
	    }
	    returnString = returnString + cardNumberString.substr(cardNumberString.length - 4);
	    return returnString;
	}
}