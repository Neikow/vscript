; --------------------------
;     Generated assembly    
; --------------------------

%include	'utils.asm'

%include	'std/types/strings.asm'

section .text
global  _start

_start:
	xor		rax, rax
	xor		rbx, rbx
	xor		rcx, rcx
	xor		rdx, rdx
	mov		rbp, rsp	; save program base pointer
	push	rbp

; Memory Allocation
	mov		rcx, 16384
	call	memalloc


	mov		rsi, _s0
	mov		rcx, 17
	call	string_make
	push	rax
	inc		qword [rax + 1 * 8]

	; statement_debug (str)
	mov		rax, [rbp - 2 * 8]
	push	rax	; = &x
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprintLF

	mov		rsi, _s1
	mov		rcx, 1
	call	string_make
	push	rax
	mov		rsi, _s2
	mov		rcx, 1
	call	string_make
	push	rax
	mov		rsi, _s1
	mov		rcx, 1
	call	string_make
	push	rax
	mov		rsi, _s1
	mov		rcx, 1
	call	string_make
	push	rax
	mov		rsi, _s3
	mov		rcx, 1
	call	string_make
	push	rax
	pop		rdx
	pop		rcx
	call	string_concat
	push	rax
	pop		rdx
	pop		rcx
	call	string_concat
	push	rax
	pop		rdx
	pop		rcx
	call	string_concat
	push	rax
	pop		rdx
	pop		rcx
	call	string_concat
	push	rax
	inc		qword [rax + 1 * 8]

	; statement_debug (str)
	mov		rax, [rbp - 3 * 8]
	push	rax	; = &y
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprintLF

	mov		rax, [rbp - 2 * 8]
	push	rax	; = &x
	mov		rbx, [rbp - 3 * 8]
	push	rbx	; = &y
	pop		rdx
	pop		rcx
	call	string_concat
	inc		qword [rax + 1 * 8]
	mov		[rbp - 2 * 8], rax
	; statement_debug (str)
	mov		rax, [rbp - 2 * 8]
	push	rax	; = &x
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprintLF

	xor		rcx, rcx	; 0 exit code
	call	exit

section .data
brk_init: dq 0x0
brk_curr: dq 0x0
brk_new: dq 0x0

_s0: db 'hello my name is ', 0h, 0h, 0h, 0h, 0h, 0h, 0h
_s1: db 'b', 0h, 0h, 0h, 0h, 0h, 0h, 0h
_s2: db 'o', 0h, 0h, 0h, 0h, 0h, 0h, 0h
_s3: db 'y', 0h, 0h, 0h, 0h, 0h, 0h, 0h

section .bss
output_buffer: resb 128
