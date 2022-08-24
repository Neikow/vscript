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



	push	rcx
	mov		rcx, 10
	call	u64_make
	pop		rcx
	push	rax
	inc		qword [rax + 1 * 8]

while0:
	mov		rax, [rbp - 2 * 8]
	push	rax	; = &x
	push	rcx
	mov		rcx, 0
	call	u64_make
	pop		rcx
	push	rax
	pop		rdx
	pop		rcx
	call	u64_gt_u64
	cmp		qword [rax + 2 * 8], 0
	je		end_while0

	; statement_debug (u64)
	mov		rax, [rbp + -2 * 8]
	push	rax	; = &x
	push	rcx
	mov		rcx, 2
	call	u64_make
	pop		rcx
	push	rax
	pop		rdx
	pop		rcx
	dec		qword [rcx + 1 * 8]
	call	u64_sub_u64
	inc		qword [rax + 1 * 8]
	push	rax
	mov		[rbp + -2 * 8], rax
	pop		rcx
	call	u64_stdout
	call	linefeed

	push	rcx
	mov		rcx, 100
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
obj_true:
	dq 0
	dq -1
	dq 1
obj_false:
	dq 0
	dq -1
	dq 0
str_null: db '[94mnull[39m'
str_null_len: dq 14
str_true: db '[95mtrue[39m'
str_true_len: dq 14
str_false: db '[95mfalse[39m'
str_false_len: dq 15
str_err_out_of_bounds_name: db 'Error [Out Of Bounds]'
str_err_out_of_bounds_desc: db 'The given index is outside the bounds of the array.'

section .data
brk_init: dq 0x0
brk_curr: dq 0x0
timespec:
	ts_sec: dq 0
	ts_nsec: dq 0

section .bss
output_buffer: resb 512
