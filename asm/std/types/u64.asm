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
; rax <- new u64 address
u64_mul_u64:
  push  rbx
  mov   rax, [rcx + 2 * 8]    ; u64 (1) value
  mov   rbx, [rdx + 2 * 8]    ; u64 (2) value
  mul   rbx
  mov   rcx, rax
  call  u64_make
  pop   rbx
  ret
  
; decreases the value of u64 returning the same object
; rcx -> object     (u64)
; rax <- object     (u64)
u64_dec:
  push  rcx
  

  pop   rcx

  dec   qword [rcx + 2 * 8]
  mov   rax, rcx
  ret

; increases the value of u64 returning the same object
; rcx -> object     (u64)
; rax <- object     (u64)
u64_inc:
  inc   qword [rcx + 2 * 8]
  mov   rax, rcx
  ret

;
; rcx -> object (1) (u64)
; rdx -> object (2) (u64)
; rax <- result     (bool)
u64_gt_u64:
  mov   rcx, [rcx + 2 * 8]

  cmp   rcx, [rdx + 2 * 8]
  jg    .true
.false:
  mov   rcx, 0
  jmp   .make
.true:
  mov   rcx, 1     
.make:
  call  bool_make
  ret

;
; rcx -> object (1) (u64)
; rdx -> object (2) (u64)
; rax <- result     (bool)
u64_lt_u64:
  mov   rcx, [rcx + 2 * 8]
  cmp   rcx, [rdx + 2 * 8]
  jl    .true
.false:
  mov   rcx, 0
  jmp   .make
.true:
  mov   rcx, 1     
.make:
  call  bool_make
  ret

;
; rcx -> object (1) (u64)
; rdx -> object (2) (u64)
; rax <- result     (bool)
u64_geq_u64:
  mov   rcx, [rcx + 2 * 8]
  cmp   rcx, [rdx + 2 * 8]
  jge   .true
.false:
  mov   rcx, 0
  jmp   .make
.true:
  mov   rcx, 1     
.make:
  call  bool_make
  ret

;
; rcx -> object (1) (u64)
; rdx -> object (2) (u64)
; rax <- result     (bool)
u64_leq_u64:
  mov   rcx, [rcx + 2 * 8]
  cmp   rcx, [rdx + 2 * 8]
  jle   .true
.false:
  mov   rcx, 0
  jmp   .make
.true:
  mov   rcx, 1     
.make:
  call  bool_make
  ret

;
; rcx -> object (1) (u64)
; rdx -> object (2) (u64)
; rax <- result     (bool)
u64_eq_u64:
  mov   rcx, [rcx + 2 * 8]
  cmp   rcx, [rdx + 2 * 8]
  je    .true
.false:
  mov   rcx, 0
  jmp   .make
.true:
  mov   rcx, 1     
.make:
  call  bool_make
  ret

;
; rcx -> object (1) (u64)
; rdx -> object (2) (u64)
; rax <- result     (bool)
u64_neq_u64:
  mov   rcx, [rcx + 2 * 8]
  cmp   rcx, [rdx + 2 * 8]
  je    .false
.true:
  mov   rcx, 1     
  jmp   .make
.false:
  mov   rcx, 0
.make:
  call  bool_make
  ret