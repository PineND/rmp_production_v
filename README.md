# RateMyProfessors extention for Berkeleytime
This extension enhances the Berkeleytime course catalog by adding RateMyProfessors statistics directly to the catalog page.
The extention can be found here: https://chromewebstore.google.com/detail/better-berkeleytime/declfjbohkamclnjbpjhcfpgmmceloam

## Set Up
Works as is.
    
## How It Works
# RMP Data Fetching:
- The script constructs a GraphQL query to the RMP API.
- It sends a POST request to the RMP GraphQL endpoint with appropriate headers (including authorization and cookies) & a payload containing the GraphQL query and variables (including the instructor's name)
- The RMP server processes the request and sends back the response.
# Performance Optimization:
The script uses caching to store fetched RMP data, reducing the number of API calls. It also implements retry & timeout logic for table modification in case the table is not immediately available.

## Chronic Issues
- API Dependency: The extension relies heavily on RMP's GraphQL API. Any changes to this API could break the extension's functionality.
- Data Extraction Robustness: The methods employed for data extraction from both Berkeleytime and RateMyProfessors are fragile. Updates to these websites would likely break the extention as well.
- Caching Limitations: The current caching mechanism (using an array) is not persistent across page reloads or browser sessions.
