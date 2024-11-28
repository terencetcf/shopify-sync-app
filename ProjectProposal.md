**Proposal Outline: Shopify Store Sync Application**

---

#### **Background**

The client is currently developing a new store front, which involves rearranging products into collections, creating new templates within the theme, and linking products to collections without affecting their live production store. To facilitate this, they have created a test store where these changes can be safely made and evaluated.

However, they need realistic, production-like data in the test store to effectively see how these changes will work. They also want the ability to promote the new configurations back to the production store once the development and testing are completed. Without an efficient tool, this process is manual, time-consuming, and prone to inconsistencies, increasing the risk of errors when moving configurations between environments.

---

#### **1. Problem Overview**

Shopify stores are built on interconnected **products**, **collections**, **pages**, and **themes**, with content objects (outside the theme) linking to templates (inside the theme). Maintaining consistency between production and test stores during development is challenging due to:

- **ID Mismatches**: Shopify assigns unique IDs per store, making direct syncing by ID unfeasible.
- **Handle-Based Linking**: Relationships (e.g., products to collections) depend on consistent handles.
- **Complex Linkages**:
  - **Products**: Can belong to multiple collections.
  - **Collections**: Linked to templates via `template_suffix` and may include products by ID or tag rules.
  - **Pages**: Linked to templates via `template_suffix`.

Manual recreation of these relationships is time-consuming and prone to error. A standalone synchronisation application is needed to automate syncing, preserve linkages, and ensure consistent testing without disrupting production.

---

#### **2. Objectives**

- Create a standalone application that can be run on Microsoft Windows to sync products, collections, and pages between stores.
- Maintain object relationships using handles, ensuring consistency.
- Provide a UI to display differences and allow selective or full synchronisation.
- In addition to the main requirements, the client also requires that the search bar be removed from the home page and the logo centred.

---

## Features

- **Synchronisation:**
  - Sync products, collections, and pages between stores.
  - **Products**: Sync key properties such as metadata (e.g., handles, tags), content (e.g., titles, descriptions), images, and SEO settings.
  - **Collections**: Sync main properties including metadata, collection rules (e.g., product tags), descriptions, and template associations.
  - **Pages**: Sync key properties such as content (e.g., titles, body HTML), SEO settings, and template associations.
  - Maintain relationships via handles, not IDs.
  - Ensure links between content objects (products, collections, pages) and templates inside the theme remain intact, preserving the correct visual representation and layout on the storefront.
  - Enable selective or bulk sync.
- **Comparison Tool:**
  - Display differences between stores for products, collections, and pages.
  - Filter mismatched, missing, or updated objects.
- **Logging and Notifications:**
  - Record sync operations with success or failure details.
  - Notify users of issues during synchronisation.
- **Store UI Changes**:
  - Remove the search bar and centre the logo.

#### **Out of Scope**

Syncing product variants and prices is excluded from the new tool's functionality as there is an existing separate tool that handles these tasks. The existing Price Updater tool syncs product variants from the client's Master Pricing Spreadsheet to Shopify, ensuring that the spreadsheet remains the source of truth for pricing. The new tool will sync products but exclude variant-specific data. If needed, functionality to sync product variants and prices can be added to the new tool in the future.

---

#### **4. Project Phases**

**Phase 1: Requirements and Design (5 Days)**

- Confirm data types, dependencies, and scope.
- Design API integration and UI.
- Confirm requirements for removing the search bar and centring the logo.

**Phase 2: Development (15 Days)**

- Build syncing functionality for products, collections, and pages.
- Implement handle-based linking and logging.
- Develop a UI for comparisons and sync controls.

**Phase 3: Testing and Refinement (5 Days)**

- Validate functionality and scalability.
- Incorporate client feedback.

**Phase 4: Deployment (3 Days)**

- Deploy to staging for final review.
- Conduct user training and deliver documentation.

---

#### **5. Deliverables**

- **UI Changes**: Removal of the search bar from the home page and centring the logo.
- **Windows Application**: A standalone Windows application to sync products, collections, and pages between stores.
- **How-to Guide or Video Guide**: A detailed guide to help users understand and operate the sync tool effectively.
- **Support for Initial Sync**: Assistance in running the first sync from Production to Test and then from Test to Production, ensuring a smooth transition.
- **Bug Fixing Support**: Support to identify and fix any bugs found during or after the initial sync operations.

---

#### **6. Estimated Timeline**

Total: **28 Days**

- Requirements and Design: 5 Days
- Development: 15 Days
- Testing: 5 Days
- Deployment: 3 Days

---

#### **7. Key Considerations**

- **Handle-Based Linking**: Preserve relationships by syncing based on handles, not IDs.
- **Creation Rate Limits**: Shopify may have limits on the total or daily creation rate for products, collections, and pages. These limits must be considered during syncing, and proper error handling must be implemented to avoid hitting these constraints.
- **API Rate Limits**: Implement batching and retries to avoid exceeding limits.
- **Theme Files Excluded**: Synchronisation focuses on content objects. Themes are backed up and restored separately.

---

#### **11. Shopify API Rate Limits**

Shopify imposes limits to ensure platform stability:

- **REST Admin API**: Standard Plan allows 2 requests/sec; Plus Plan allows 20 requests/sec.
- **GraphQL Admin API**: Standard Plan offers 50 points/sec; Plus Plan offers 500 points/sec.
- **Product Variants**: Creation is limited to 1,000 new variants per day for stores with over 50,000 variants.

**Best Practices**:

- **Batching Requests** to reduce API calls.
- **Retries** with exponential backoff for rate limit errors.
- **Monitoring Usage** to stay within limits.

---

#### **8. Risks and Mitigations**

| **Risk**        | **Mitigation**                                                     |
| --------------- | ------------------------------------------------------------------ |
| API rate limits | Implement batching and retries.                                    |
|                 | Ask Shopify to temporarily lift any limits on test and production. |

---

#### **9. Client Responsibilities**

- Provide API access to production and test stores.
- Define the scope of data for synchronisation.
- Review and approve app functionality during testing.

