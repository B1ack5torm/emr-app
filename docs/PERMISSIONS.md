# Permission matrix

| Permission | Clinic admin | Doctor | Nurse | Front desk | Billing | Lab/radiology |
| --- | --- | --- | --- | --- | --- | --- |
| patient:create/read/update | yes | read | read/update | yes | read | read |
| appointment:create/manage | yes | manage | manage | yes | no | no |
| encounter:create/finalize | yes | yes | create | create | no | no |
| prescription:create | yes | yes | no | no | no | no |
| order:create | yes | yes | no | no | no | yes |
| result:review | yes | yes | no | no | no | no |
| document:upload | yes | yes | yes | yes | no | yes |
| invoice:create/payment:record | yes | no | no | no | yes | no |
| audit:read, user:manage, settings:manage | yes | no | no | no | no | no |

`ADMIN` remains a compatibility alias for `CLINIC_ADMIN`; `RECEPTION` remains a compatibility alias for `FRONT_DESK`. The server maps roles to permissions in `src/lib/security.ts`. New endpoints must enforce permissions on the server.
