# Verafi – Issue Summary

- **VF001 – Login OTP:** Copy-pasting the OTP didn’t work before; now fixed.
- **VF002 – Identity Validation:** ID check was failing due to an incorrect internal count; resolved.
- **VF003 – Contact Validation:** Phone OTP worked during testing; likely a credential/environment issue.
- **VF004 – Submit Log Button:** Shown in UI but has no defined function; needs requirements.
- **VF005 – Manage Configuration:** Configuration changes weren’t saving; fixed.
- **VF006 – Appearance Settings:** Appearance save wasn’t working; corrected.
- **VF007 – Usage Dashboard Data:** Looked hardcoded due to fallback data; updated to avoid confusion.
- **VF008 – Create User:** User creation wasn’t working; now fixed.
- **VF009 – Subscription Notice:** Looked hardcoded due to fallback data; corrected.
- **VF010 – Overview Page:** Same fallback data issue; fixed.
- **VF011 – Usage Analytics:** Same fallback data confusion; resolved.
- **VF012 – Add Service Form:** Couldn’t scroll on smaller screens; now fixed.
- **VF013 – Delete Services:** Looked hardcoded due to fallback data; corrected.
- **VF014 – Add Tenant:** Not implemented because it’s outside the agreed scope.
- **VF015 – Delete Tenant:** Not supported because tenant removal isn’t part of the requirement.
- **VF016 – Edit Tenant:** Editing tenants not included in the requirement, so not implemented.
- **VF017 – Verification Logs:** Logs weren’t loading due to auth issue; now fixed.
- **VF018 – Forgot Password:** OTP flow broke due to state handling; fixed.
