/**
 * WISH-370: E.164 Phone Number Formatter - Test Suite
 * 
 * Run with: node docs/features/WISH-370/formatter.test.js
 * 
 * This test file contains the same formatting logic as contact-edit.html.php
 * and validates it against comprehensive test cases.
 */

// ============================================
// FORMATTER LOGIC (copied from contact-edit.html.php)
// ============================================

const callingCodes = {
    'US': '1', 'CA': '1', 'GB': '44', 'AU': '61', 'NZ': '64', 'SG': '65',
    'AF': '93', 'AL': '355', 'DZ': '213', 'AS': '1684', 'AD': '376',
    'AO': '244', 'AI': '1264', 'AG': '1268', 'AR': '54', 'AM': '374',
    'AW': '297', 'AT': '43', 'AZ': '994', 'BS': '1242', 'BH': '973',
    'BD': '880', 'BB': '1246', 'BY': '375', 'BE': '32', 'BZ': '501',
    'BJ': '229', 'BM': '1441', 'BT': '975', 'BO': '591', 'BA': '387',
    'BW': '267', 'BR': '55', 'IO': '246', 'BN': '673', 'BG': '359',
    'BF': '226', 'BI': '257', 'KH': '855', 'CM': '237', 'CV': '238',
    'KY': '1345', 'CF': '236', 'TD': '235', 'CL': '56', 'CN': '86',
    'CX': '61', 'CC': '61', 'CO': '57', 'KM': '269', 'CG': '242',
    'CD': '243', 'CK': '682', 'CR': '506', 'HR': '385', 'CU': '53',
    'CY': '357', 'CZ': '420', 'DK': '45', 'DJ': '253', 'DM': '1767',
    'DO': '1809', 'TL': '670', 'EC': '593', 'EG': '20', 'SV': '503',
    'GQ': '240', 'ER': '291', 'EE': '372', 'ET': '251', 'FK': '500',
    'FO': '298', 'FJ': '679', 'FI': '358', 'FR': '33', 'GF': '594',
    'PF': '689', 'GA': '241', 'GM': '220', 'GE': '995', 'DE': '49',
    'GH': '233', 'GI': '350', 'GR': '30', 'GL': '299', 'GD': '1473',
    'GP': '590', 'GU': '1671', 'GT': '502', 'GN': '224', 'GW': '245',
    'GY': '592', 'HT': '509', 'HN': '504', 'HK': '852', 'HU': '36',
    'IS': '354', 'IN': '91', 'ID': '62', 'IR': '98', 'IQ': '964',
    'IE': '353', 'IL': '972', 'IT': '39', 'CI': '225', 'JM': '1876',
    'JP': '81', 'JE': '44', 'JO': '962', 'KZ': '7', 'KE': '254',
    'KI': '686', 'KR': '82', 'XK': '383', 'KW': '965', 'KG': '996',
    'LA': '856', 'LV': '371', 'LB': '961', 'LS': '266', 'LR': '231',
    'LY': '218', 'LI': '423', 'LT': '370', 'LU': '352', 'MO': '853',
    'MK': '389', 'MG': '261', 'MW': '265', 'MY': '60', 'MV': '960',
    'ML': '223', 'MT': '356', 'MH': '692', 'MQ': '596', 'MR': '222',
    'MU': '230', 'YT': '262', 'MX': '52', 'FM': '691', 'MD': '373',
    'MC': '377', 'MN': '976', 'ME': '382', 'MS': '1664', 'MA': '212',
    'MZ': '258', 'MM': '95', 'NA': '264', 'NR': '674', 'NP': '977',
    'NL': '31', 'NC': '687', 'NI': '505', 'NE': '227', 'NG': '234',
    'NU': '683', 'NF': '672', 'MP': '1670', 'NO': '47', 'OM': '968',
    'PK': '92', 'PW': '680', 'PA': '507', 'PG': '675', 'PY': '595',
    'PE': '51', 'PH': '63', 'PN': '64', 'PL': '48', 'PT': '351',
    'PR': '1787', 'QA': '974', 'RE': '262', 'RO': '40', 'RU': '7',
    'RW': '250', 'KN': '1869', 'LC': '1758', 'VC': '1784', 'WS': '685',
    'SM': '378', 'ST': '239', 'SA': '966', 'SN': '221', 'RS': '381',
    'SC': '248', 'SL': '232', 'SK': '421', 'SI': '386', 'SB': '677',
    'SO': '252', 'ZA': '27', 'ES': '34', 'LK': '94', 'SH': '290',
    'PM': '508', 'SD': '249', 'SR': '597', 'SZ': '268', 'SE': '46',
    'CH': '41', 'SY': '963', 'TW': '886', 'TJ': '992', 'TZ': '255',
    'TH': '66', 'TG': '228', 'TK': '690', 'TO': '676', 'TT': '1868',
    'TN': '216', 'TR': '90', 'TM': '993', 'TC': '1649', 'TV': '688',
    'UG': '256', 'UA': '380', 'AE': '971', 'UM': '1', 'UY': '598',
    'UZ': '998', 'VU': '678', 'VE': '58', 'VN': '84', 'VG': '1284',
    'VI': '1340', 'WF': '681', 'EH': '212', 'YE': '967', 'ZM': '260',
    'ZW': '263'
};

function getCallingCode(isoCode) {
    return callingCodes[isoCode] || '1';
}

function formatPhoneToE164(phoneNumber, isoCountryCode) {
    if (!phoneNumber || phoneNumber.trim() === '') {
        return { success: false, formatted: null, display: null, error: 'No phone number entered' };
    }

    const original = phoneNumber.trim();
    const callingCode = getCallingCode(isoCountryCode);

    // Check if number already starts with +
    if (original.charAt(0) === '+') {
        const digitsOnly = original.replace(/[^0-9]/g, '');
        if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
            const formatted = '+' + digitsOnly;
            return {
                success: true,
                formatted: formatted,
                display: formatted,
                alreadyFormatted: (original.replace(/[^0-9+]/g, '') === formatted),
                error: null
            };
        }
    }

    // Handle "00" international dialing prefix
    let working = original;
    if (working.match(/^00[1-9]/)) {
        working = '+' + working.substring(2);
        const digitsAfterPlus = working.replace(/[^0-9]/g, '');
        if (digitsAfterPlus.length >= 7 && digitsAfterPlus.length <= 15) {
            const formatted = '+' + digitsAfterPlus;
            return {
                success: true,
                formatted: formatted,
                display: formatted,
                error: null
            };
        }
    }

    // Strip all non-digit characters
    let digits = original.replace(/[^0-9]/g, '');

    if (digits.length === 0) {
        return { success: false, formatted: null, display: null, error: 'No digits found in phone number' };
    }

    // Check if number already starts with the country calling code
    if (digits.indexOf(callingCode) === 0) {
        const nationalPart = digits.substring(callingCode.length);
        if (nationalPart.length >= 4 && nationalPart.length <= 14) {
            const formatted = '+' + digits;
            if (formatted.length >= 8 && formatted.length <= 16) {
                return {
                    success: true,
                    formatted: formatted,
                    display: '+' + callingCode + ' ' + nationalPart,
                    error: null
                };
            }
        }
    }

    // Handle local trunk prefix (leading 0)
    if (digits.charAt(0) === '0' && digits.length > 7) {
        digits = digits.substring(1);
    }

    // Construct E.164
    const e164 = '+' + callingCode + digits;

    if (e164.length < 8 || e164.length > 16) {
        return {
            success: false,
            formatted: null,
            display: null,
            error: 'Phone number length is invalid (too short or too long)'
        };
    }

    return {
        success: true,
        formatted: e164,
        display: '+' + callingCode + ' ' + digits,
        error: null
    };
}

// ============================================
// TEST FRAMEWORK
// ============================================

let passed = 0;
let failed = 0;
const failures = [];

function test(name, input, country, expectedSuccess, expectedFormatted) {
    const result = formatPhoneToE164(input, country);
    
    let testPassed = false;
    
    if (expectedSuccess) {
        testPassed = result.success && result.formatted === expectedFormatted;
    } else {
        testPassed = !result.success;
    }
    
    if (testPassed) {
        passed++;
        console.log(`  ✓ ${name}`);
    } else {
        failed++;
        const failureMsg = `  ✗ ${name}
      Input: "${input}" | Country: ${country}
      Expected: ${expectedSuccess ? expectedFormatted : 'ERROR'}
      Got: ${result.success ? result.formatted : 'ERROR: ' + result.error}`;
        console.log(failureMsg);
        failures.push({ name, input, country, expectedSuccess, expectedFormatted, result });
    }
}

function section(title) {
    console.log(`\n${title}`);
    console.log('─'.repeat(60));
}

// ============================================
// TEST CASES
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('  WISH-370: E.164 Phone Formatter Test Suite');
console.log('═'.repeat(60));

// 1. Basic Happy Path Tests
section('1. Basic Happy Path Tests (US)');
test('Standard 10-digit US', '7015551234', 'US', true, '+17015551234');
test('Formatted US with parens', '(701) 555-1234', 'US', true, '+17015551234');
test('US with dashes', '701-555-1234', 'US', true, '+17015551234');
test('US with dots', '701.555.1234', 'US', true, '+17015551234');
test('US with spaces', '701 555 1234', 'US', true, '+17015551234');

// 2. Already E.164 Formatted
section('2. Already E.164 Formatted');
test('Already E.164 US', '+17015551234', 'US', true, '+17015551234');
test('Already E.164 PH (country ignored)', '+639082214025', 'US', true, '+639082214025');
test('E.164 with spaces should clean', '+44 7911 123456', 'GB', true, '+447911123456');

// 3. Numbers WITH Country Code Already Embedded
section('3. Numbers WITH Country Code Already Embedded');
test('PH number with 63 prefix', '639082214025', 'PH', true, '+639082214025');
test('US number with 1 prefix', '17015551234', 'US', true, '+17015551234');
test('UK number with 44 prefix', '447911123456', 'GB', true, '+447911123456');
test('AU number with 61 prefix', '61412345678', 'AU', true, '+61412345678');

// 4. Local Trunk Prefix (Leading 0)
section('4. Local Trunk Prefix (Leading 0)');
test('PH local mobile format', '09082214025', 'PH', true, '+639082214025');
test('UK mobile with trunk 0', '07911123456', 'GB', true, '+447911123456');
test('AU mobile with trunk 0', '0412345678', 'AU', true, '+61412345678');
test('French mobile with 0', '0612345678', 'FR', true, '+33612345678');
test('German landline with 0', '0891234567', 'DE', true, '+49891234567');

// 5. International Dialing Prefix (00)
section('5. International Dialing Prefix (00)');
test('00 prefix to PH', '00639082214025', 'PH', true, '+639082214025');
test('00 prefix to US', '0017015551234', 'US', true, '+17015551234');
test('00 prefix to UK with dashes', '0044-7911-123456', 'GB', true, '+447911123456');

// 6. Country Fallback (No Country Selected)
section('6. Country Fallback (Empty Country defaults to US)');
test('No country defaults to US', '7015551234', '', true, '+17015551234');
test('No country with invalid code', '7015551234', 'XX', true, '+17015551234');

// 7. Edge Cases - Too Short / Too Long
// Note: Numbers starting with '1' for US are detected as having country code embedded
section('7. Edge Cases - Too Short / Too Long');
test('Too short: 3 digits', '123', 'US', false, null);
test('Too short: 4 digits', '1234', 'US', false, null);
test('Too short: 5 digits (result too short even with country code)', '12345', 'US', false, null);
test('6 digits starting with 1 (seen as +1 + 23456)', '123456', 'US', true, '+1123456');
test('7 digits starting with 1 (seen as +1 + 234567)', '1234567', 'US', true, '+1234567');
test('7 digits NOT starting with 1', '2345678', 'US', true, '+12345678');
test('15 digits starting with 1 (detects country code)', '123456789012345', 'US', true, '+123456789012345');
test('Too long: 16 digits', '1234567890123456', 'US', false, null);
test('Way too long: 20 digits', '12345678901234567890', 'US', false, null);

// 8. Weird/Edge Inputs
section('8. Weird/Edge Inputs');
test('Empty string', '', 'US', false, null);
test('Whitespace only', '   ', 'US', false, null);
test('Letters only', 'abc-def-ghij', 'US', false, null);
test('Special chars only', '!@#$%^&*()', 'US', false, null);
test('Just plus sign', '+', 'US', false, null);

// 9. International Variety
section('9. International Variety');
test('SF area code', '4155551234', 'US', true, '+14155551234');
test('NYC area code', '2125551234', 'US', true, '+12125551234');
test('Toronto Canada', '4165551234', 'CA', true, '+14165551234');
test('London landline', '2071234567', 'GB', true, '+442071234567');
test('UK mobile', '7911123456', 'GB', true, '+447911123456');
test('Sydney landline', '298765432', 'AU', true, '+61298765432');
test('Paris France', '112345678', 'FR', true, '+33112345678');
test('Berlin Germany', '301234567', 'DE', true, '+49301234567');
test('Italian mobile', '335551234', 'IT', true, '+39335551234');
test('Spanish mobile', '612345678', 'ES', true, '+34612345678');
test('Indian mobile', '9876543210', 'IN', true, '+919876543210');
test('Japanese mobile', '8012345678', 'JP', true, '+818012345678');
test('Mexico', '1012345678', 'MX', true, '+521012345678');
test('New Zealand mobile', '212345678', 'NZ', true, '+64212345678');

// 10. Original WISH-370 Bug Cases
section('10. Original WISH-370 Bug Cases (Philippines)');
test('Original bug: 63-908-221-4025', '63-908-221-4025', 'PH', true, '+639082214025');
test('With 00 prefix', '0063-908-221-4025', 'PH', true, '+639082214025');
test('Without country code', '908-221-4025', 'PH', true, '+639082214025');
test('Local format with 0', '0908-221-4025', 'PH', true, '+639082214025');

// ============================================
// RESULTS SUMMARY
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('  TEST RESULTS');
console.log('═'.repeat(60));
console.log(`  Total:  ${passed + failed}`);
console.log(`  Passed: ${passed} ✓`);
console.log(`  Failed: ${failed} ✗`);
console.log('═'.repeat(60));

if (failed > 0) {
    console.log('\n  FAILED TESTS:');
    failures.forEach((f, i) => {
        console.log(`\n  ${i + 1}. ${f.name}`);
        console.log(`     Input: "${f.input}" | Country: ${f.country}`);
        console.log(`     Expected: ${f.expectedSuccess ? f.expectedFormatted : 'ERROR'}`);
        console.log(`     Got: ${f.result.success ? f.result.formatted : 'ERROR: ' + f.result.error}`);
    });
}

console.log('\n');

// Exit with error code if any tests failed
process.exit(failed > 0 ? 1 : 0);
