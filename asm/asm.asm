; --------------------------
;     Generated assembly    
; --------------------------

%include	'utils.asm'

%include	'std/types.asm'

%include	'std/errors.asm'

%include	'std/memory.asm'

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
	mov		rcx, 4194304
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



while0:
	push	rcx
	mov		rcx, 1	; bool value
	call	bool_make
	pop		rcx
	cmp		qword [rax + 2 * 8], 0
	je		end_while0

	; statement_debug (u64)
	push	rcx
	mov		rcx, 10
	call	u64_make
	pop		rcx
	push	rax
	pop		rcx
	call	u64_stdout
	call	linefeed

	push	rcx
	mov		rcx, 1
	call	u64_make
	pop		rcx
	push	rax
	pop		rcx
	call	sleep

	jmp		while0

end_while0:
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
timespec:
	ts_sec: dq 0
	ts_nsec: dq 0
lit_null: dq '0x0'
lit_true: dq '0x0'
lit_false: dq '0x0'

section .bss
output_buffer: resb 512
