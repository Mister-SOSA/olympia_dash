const config = {
    API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:5001",
    PARENT_COMPANY_MAPPING: {
        "GORDON FOOD": "GORDON FOOD",
        "RESTAURANT DEPOT": "RESTAURANT DEPOT",
        "SYSCO": "SYSCO",
        "US FOODS": "US FOODS",
        "DOT FOODS": "DOT FOODS",
        "PERFORMANCE FOODSERVICE": "PERFORMANCE FOODSERVICE",
        "GORDON FOOD SERVICE": "GORDON FOOD SERVICE",
        "PFG": "PFG"
    }
};

export default config;