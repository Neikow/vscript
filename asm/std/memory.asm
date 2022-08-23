; Allocates memory
; rcx -> number of bytes to allocate (u64)
; rax <- current break value
memalloc:
  push  rdi
  mov		rax, 12   ; get current break
	xor		rdi, rdi
	syscall
  mov   [brk_curr], rax
  mov   [brk_init], rax
  add   rax, rcx
	mov		rdi, rax
	mov		rax, 12
	syscall
  pop   rdi
  ret