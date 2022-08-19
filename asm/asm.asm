; --------------------------
;     Generated assembly    
; --------------------------

%include	'utils.asm'

%include	'std/types/strings.asm'

%include	'std/types/u64.asm'

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


	mov		rcx, 10
	call	u64_make
	push	rax
	inc		qword [rax + 1 * 8]

	mov		rcx, 20
	call	u64_make
	push	rax
	inc		qword [rax + 1 * 8]

	; statement_debug (str)
	mov		rax, [rbp - 2 * 8]
	push	rax	; = &x
	mov		rax, [rbp - 3 * 8]
	push	rax	; = &y
	mov		rcx, 40
	call	u64_make
	push	rax
	pop		rdx
	pop		rcx
	call	u64_add_u64
	push	rax
	pop		rdx
	pop		rcx
	call	u64_add_u64
	push	rax
	pop		rcx
	mov		rcx, [rcx + 2 * 8]
	call	iprintLF

	xor		rcx, rcx	; 0 exit code
	call	exit

section .data
brk_init: dq 0x0
brk_curr: dq 0x0
brk_new: dq 0x0


section .bss
output_buffer: resb 128
