; creates a new unsigned integer object in memory
; rcx -> u64 value
; rax <- u64 object address
u64_make:
  mov   rdi, [brk_curr]
  push  rdi
  mov   qword [rdi + 0 * 8], 0    ; u64 object static `this`
  mov   qword [rdi + 1 * 8], 0    ; reference count
  mov   qword [rdi + 2 * 8], rcx  ; value
  add   rdi, 3 * 8
  mov   [brk_curr], rdi
  pop   rax
  ret

; adds two u64
; rcx -> u64 (1) 
; rdx -> u64 (2)
; rax <- new u64 address 
u64_add_u64:
  mov   rax, [rcx + 2 * 8]    ; u64 (1) value
  add   rax, [rdx + 2 * 8]    ; u64 (1) value
  mov   rcx, rax
  call  u64_make
  ret
