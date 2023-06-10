/*
'No role permissions.',
'Unauthorized status.',
'Passwords do not match.',
'Not enough arguments provided.',
'Bad setting at requiredLoginItems.',
'fail send notice',
'Unchanged email',
'JWT parse error',
'Internal Server Error',
'Not allowed one time password',
*/

export const EM = {
  9000: null,
  9001: 'Administrator registration is not possible if there is other data.',
  9002: null,
  9003: null,

  9004: null,
  9005: 'No role permissions.',
  9006: 'Unauthorized status.',
  9007: null,

  9008: null,
  9009: 'No role permissions.',
  9010: 'Unauthorized status.',

  9011: null,
  9012: 'No role permissions.',
  9013: 'Unauthorized status.',

  9014: null,
  9015: 'No role permissions.',
  9016: 'Unauthorized status.',
  9017: null,

  9018: null,
  9019: 'No role permissions.',
  9020: 'Unauthorized status.',
  9021: 'The user information must include an ID and a version obtained from the database.',

} as const
type EM = typeof EM & { [key:number]: string | null }

// Regular expression for searching the target line
// new E\d+|pushReplyCode\(
