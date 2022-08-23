; --------------------------
;     Generated assembly    
; --------------------------

%include	'utils.asm'

%include	'std/types.asm'

%include	'std/errors.asm'

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
	mov		rcx, 1048576
	call	memalloc

	mov		rcx, 4	; literal length
	mov		rdx, str_null	; literal string
	call	string_make
	mov		[lit_null], rax

	mov		rcx, 4	; literal length
	mov		rdx, str_true	; literal string
	call	string_make
	mov		[lit_true], rax

	mov		rcx, 5	; literal length
	mov		rdx, str_false	; literal string
	call	string_make
	mov		[lit_false], rax



	mov		rdx, [brk_curr]	; array base
	mov		rdi, rdx
	add		rdi, 8 * 8	; allocate space for the array
	mov		[brk_curr], rdi
	mov		rcx, 8
	call	array_make
	push	rax	; array address
	mov		rdi, rdx

	; initial values
	push	rcx
	mov		rcx, 10
	call	u64_make
	pop		rcx
	mov		[rdi + 0 * 8], rax

	push	rcx
	mov		rcx, 20
	call	u64_make
	pop		rcx
	mov		[rdi + 1 * 8], rax

	push	rcx
	mov		rcx, 30
	call	u64_make
	pop		rcx
	mov		[rdi + 2 * 8], rax

	push	rcx
	mov		rcx, 40
	call	u64_make
	pop		rcx
	mov		[rdi + 3 * 8], rax

	push	rcx
	mov		rcx, 50
	call	u64_make
	pop		rcx
	mov		[rdi + 4 * 8], rax

	push	rcx
	mov		rcx, 60
	call	u64_make
	pop		rcx
	mov		[rdi + 5 * 8], rax

	pop		rax
	push	rax
	mov		qword [rax + 3 * 8], 6	; initial size
	inc		qword [rax + 1 * 8]

	; statement_debug (u64)
	mov		rcx, [rbp - 2 * 8]
	push	rcx
	mov		rcx, 4
	call	u64_make
	pop		rcx
	push	rax
	pop		rdx
	call	array_access
	push	rax
	pop		rcx
	call	u64_stdout
	call	linefeed

	; statement_debug (u64)
	mov		rcx, [rbp - 2 * 8]
	push	rcx
	mov		rcx, 4
	call	u64_make
	pop		rcx
	push	rax
	pop		rdx
	call	array_access
	push	rcx
	mov		rcx, 1
	call	u64_make
	pop		rcx
	push	rax
	pop		r8
	call	array_update
	push	rax
	pop		rcx
	call	u64_stdout
	call	linefeed

	; statement_debug (u64)
	mov		rcx, [rbp - 2 * 8]
	push	rcx
	mov		rcx, 4
	call	u64_make
	pop		rcx
	push	rax
	pop		rdx
	call	array_access
	push	rax
	pop		rcx
	call	u64_stdout
	call	linefeed

	xor		rcx, rcx	; 0 exit code
	call	exit

section .rodata
str_null: db 'null'
str_true: db 'true'
str_false: db 'false'
str_err_out_of_bounds_name: db 'Error [Out Of Bounds]'
str_err_out_of_bounds_desc: db 'The given index is outside the bounds of the array.'

section .data
brk_init: dq 0x0
brk_curr: dq 0x0
lit_null: dq '0x0'
lit_true: dq '0x0'
lit_false: dq '0x0'

section .bss
output_buffer: resb 512
