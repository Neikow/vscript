; creates a new unsigned integer object in memory
; rcx -> value              (qword)
; rax <- object address     (ptr)
u64_make:
  push  rdi
  mov   rdi, [brk_curr]
  push  rdi
  mov   qword [rdi + 0 * 8], 0    ; u64 object static `this`
  mov   qword [rdi + 1 * 8], 0    ; reference count
  mov   qword [rdi + 2 * 8], rcx  ; value
  add   rdi, 3 * 8
  mov   [brk_curr], rdi
  pop   rax
  pop   rdi
  ret

; prints u64 to STDOUT
; rcx -> u64     (ptr)
u64_stdout:
  mov   rcx, [rcx + 2 * 8]  ; u64 value
  call  iprint
  ret

; adds u64 (2) to u64 (1) returning a new object
; rcx -> u64 (1) 
; rdx -> u64 (2)
; rax <- new u64 address 
u64_add_u64:
  mov   rax, [rcx + 2 * 8]    ; u64 (1) value
  add   rax, [rdx + 2 * 8]    ; u64 (2) value
  mov   rcx, rax
  call  u64_make
  ret

; substracts u64 (2) from u64 (1) returning a new object
; rcx -> u64 (1) 
; rdx -> u64 (2)
; rax <- new u64 address 
u64_sub_u64:
  mov   rax, [rcx + 2 * 8]    ; u64 (1) value
  sub   rax, [rdx + 2 * 8]    ; u64 (2) value
  mov   rcx, rax
  call  u64_make
  ret

; multiplies u64 (1) by u64 (2) returning a new object
; rcx -> u64 (1)
; rdx -> u64 (2)
u64_mul_u64:
  mov   rax, [rcx + 2 * 8]    ; u64 (1) value
  mov   rbx, [rdx + 2 * 8]    ; u64 (2) value
  mul   rbx
  mov   rcx, rax
  call  u64_make
  ret
  