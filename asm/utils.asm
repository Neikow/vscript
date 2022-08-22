SYS_WRITE equ 1
SYS_EXIT  equ 60
STDIN     equ 0
STDOUT    equ 1
STDERR    equ 2

; Prints an integer to STDOUT
; -> rcx : integer
iprint:
  push  rcx
  push  rsi
  push  rdi
  push  rbx
  
  mov   rax, rcx    ; u64
  xor   rcx, rcx    ; digits count

.divideLoop:
  inc   rcx         
  xor   rdx, rdx
  mov   rsi, 10
  idiv  rsi
  add   rdx, 48
  push  rdx
  cmp   rax, 0
  jnz   .divideLoop
  
  mov   rdx, rcx
  xor   rbx, rbx 

.printLoop:
  dec   rcx
  pop   rax
  mov   byte [output_buffer + rbx], al
  add   rbx, 1
  cmp   rcx, 0
  jnz   .printLoop

  mov   rcx, output_buffer
  call  sprint

  pop   rbx
  pop   rdi
  pop   rsi
  pop   rcx

  ret

; Prints a char array to STDOUT
; -> rcx : char array base pointer
; -> rdx : string length
sprint:
  push  rdi
  push  rsi
  mov   rsi, rcx
	mov   rdi, STDOUT
  mov   rax, SYS_WRITE
  syscall
  pop   rsi
  pop   rdi
  ret

; Prints a boolean value to STDOUT
; -> rcx : 0 or 1
bprint:
  cmp   rcx, 0
  jnz   .printTrue
.printFalse:
  mov   rcx, lit_false
  call  string_stdout

  jmp   .endPrint
.printTrue:
  mov   rcx, lit_true
  call  string_stdout

.endPrint:
  ret

; Prints a linefeed char to STDOUT
linefeed:
  push  rsi
  push  rdi
  push  rax
  push  rbx
  push  rcx
  push  rdx
  
  mov   rdx, 1
  push  qword 0ah
  mov   rsi, rsp
  mov   rdi, STDOUT
  mov   rax, SYS_WRITE
  syscall
  add   rsp, 8

  pop   rdx
  pop   rcx
  pop   rbx
  pop   rax
  pop   rdi
  pop   rsi
  ret

; Exits the program
; -> rcx : exit code
exit:
  mov   rdi, rcx
  mov   rax, SYS_EXIT
  syscall
  ret

; Allocates memory
; rcx -> number of bytes to allocate (u64)
memalloc:
  mov		rax, 12   ; get current break
	xor		rdi, rdi
	syscall
  mov   [brk_curr], rax
  mov   [brk_init], rax
  add   rax, rcx
	mov		rdi, rax
	mov		rax, 12
	syscall
  mov   [brk_curr], rax
  ret