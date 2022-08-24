; creates a new bool object in memory
; rcx -> 0 or 1 value         (qword)
; rax <- bool object address  (ptr)
bool_make:
  cmp   rcx, 0
  je   .makeFalse
  .makeTrue:
  mov   rax, obj_true
  jmp   .endMake
  .makeFalse:
  mov   rax, obj_false
  .endMake:
  ret

; prints u64 to STDOUT
; rcx -> u64     (ptr)
bool_stdout:
  mov   rcx, [rcx + 2 * 8]  ; u64 value
  call  bprint
  ret

; applies the `and` operator to two booleans
; rcx -> bool object (1) (ptr)
; rdx -> bool object (2) (ptr)
; rax <- result object   (ptr)
bool_and:
  mov   rcx, [rcx + 2 * 8] ; bool 1 value
  mov   rdx, [rdx + 2 * 8] ; bool 2 value
  and   rcx, rdx
  call  bool_make
  ret

; applies the `or` operator to two booleans
; rcx -> bool object (1) (ptr)
; rdx -> bool object (2) (ptr)
; rax <- result object   (ptr)
bool_or:
  mov   rcx, [rcx + 2 * 8] ; bool 1 value
  mov   rdx, [rdx + 2 * 8] ; bool 2 value

  or   rcx, rdx
  call  bool_make
  ret

; applies the `xor` operator to two booleans
; rcx -> bool object (1) (ptr)
; rdx -> bool object (2) (ptr)
; rax <- result object   (ptr)
bool_xor:
  push  rbx
  mov   rcx, [rcx + 2 * 8] ; bool 1 value
  mov   rdx, [rdx + 2 * 8] ; bool 2 value

  mov   rax, rcx           ; ! bool 1 value
  not   rax
  and   rax, 1
  mov   rbx, rdx           ; ! bool 2 value
  not   rbx
  and   rbx, 1

  and   rcx, rbx
  and   rdx, rax

  or    rcx, rdx

  call  bool_make

  pop   rbx
  ret

; applies the `xor` operator to a boolean
; rcx -> bool object     (ptr)
; rax <- result object   (ptr)
bool_not:
  mov   rcx, [rcx + 2 * 8]
  xor   rax, rax
  test  rcx, rcx
  sete  al
  mov   rcx, rax
  
  call  bool_make
  ret