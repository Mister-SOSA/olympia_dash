const config = {
    API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://172.19.1.205:5001",
    PARENT_COMPANY_MAPPING: {
        "GORDON FOOD": "GORDON FOOD",
        "RESTAURANT DEPOT": "RESTAURANT DEPOT",
        "SYSCO": "SYSCO",
        "US FOODS": "US FOODS",
        "DOT FOODS": "DOT FOODS",
        "PERFORMANCE FOODSERVICE": "PERFORMANCE FOODSERVICE",
        "GORDON FOOD SERVICE": "GORDON FOOD SERVICE",
        "PFG": "PFG"
    },
    HIDDEN_OUTSTANDING_VENDOR_CODES: [
        "6685", // AIR SERVICES COMPANY
        "6087", // ARROW INDUSTRIAL SUPPLY
        "116", // BUNZL PROCESSOR DIVISION
        "235", // GRAINGER INC
        "6146", // IMPRINT ENTERPRISES
        "119", // INDUSTRIAL SOLUTIONS UNLIMITED
        "365", // MCMASTER-CARR
        "5977", // MIKSANEK ENTERPRISES, INC.
        "100", // MOTION INDUSTRIES INC
        "6247", // PRECISION ENGINEERED, INC.
        "1637", // PRO MACH INC
        "1015", // PROVISUR TECHNOLOGIES
        "776", // ROBERT REISER & CO. INC.
        "6119", // ROME GRINDING SOLUTIONS
        "6053", // ULINE
        "105", // BIRO OF CHICAGO
    ]
};

export default config;