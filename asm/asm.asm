; --------------------------
;     Generated assembly    
; --------------------------

%include	'functions.asm'
%include	'macros.asm'

section .text
global  _start

_start:
	xor		eax, eax
	xor		ebx, ebx
	xor		ecx, ecx
	xor		edx, edx
	mov		ebp, esp	; save program base pointer
	; lo: 1, go: 1
	push	ebp

	; lo: 2, go: 2
	push	10
	; statement_debug (str)
	mov		eax, _s0
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp - 2 * 4]	; (z)
	call	iprintLF

	mov		eax, [ebp - 2 * 4]	; (z)
	; lo: 3, go: 6
	push	eax	; arg 0
	; op call
	call	fn_debug_x1
	add		esp, 1 * 4	; removes arguments from stack
	; statement_debug (str)
	mov		eax, _s0
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp - 2 * 4]	; (z)
	call	iprintLF

	mov		ebx, 0	; exit code
	call	_exit

; aeaeazez(x: int): void
fn_aeaeazez3:
	; lo: 0, go: 6
	push	ebp
	mov		ebp, esp	; saves the function base pointer

	; statement_debug (str)
	mov		eax, _s4
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp + (0 + 6 + 3 + 2 - 2) * 4]	; (z)
	call	iprintLF

	; statement_debug (str)
	mov		eax, _s3
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp + (0 + 6 + 3 + 2 - 1) * 4]	; (y)
	call	iprintLF

	add		esp, 0 * 4
	pop		ebp
	ret

; debug_xy(x: int): void
fn_debug_xy2:
	; lo: 0, go: 5
	push	ebp
	mov		ebp, esp	; saves the function base pointer

	; statement_debug (str)
	mov		eax, _s0
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp + (0 + 4 + 3 + 1 - 2) * 4]	; (z)
	call	iprintLF

	; statement_debug (str)
	mov		eax, _s3
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp + (0 + 4 + 3 + 1 - 1) * 4]	; (y)
	call	iprintLF

	mov		eax, [ebp + (0 + 4 + 3 + 1 - 2) * 4]	; (z)
	; lo: 1, go: 7
	push	eax	; arg 0
	; op call
	call	fn_aeaeazez3
	add		esp, 1 * 4	; removes arguments from stack
	add		esp, 0 * 4
	pop		ebp
	ret

; debug_x(x: int): void
fn_debug_x1:
	; lo: 0, go: 3
	push	ebp
	mov		ebp, esp	; saves the function base pointer

	; statement_debug (str)
	mov		eax, _s2
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp + 2 * 4]	; (x)
	call	iprintLF

	; lo: 1, go: 4
	push	20
	; statement_debug (str)
	mov		eax, _s3
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp - 1 * 4]	; (y)
	call	iprintLF

	; statement_debug (str)
	mov		eax, _s2
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp + 2 * 4]	; (x)
	call	iprintLF

	; statement_debug (str)
	mov		eax, _s0
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp + (1 + 2 + 2 + 0 - 2) * 4]	; (z)
	call	iprintLF

	; statement_debug (str)
	mov		eax, _s0
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp + (1 + 2 + 2 + 0 - 2) * 4]	; (z)
	call	iprintLF

	; statement_debug (str)
	mov		eax, _s3
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp - 1 * 4]	; (y)
	call	iprintLF

	mov		eax, [ebp + 2 * 4]	; (x)
	; lo: 2, go: 7
	push	eax	; arg 0
	; op call
	call	fn_debug_xy2
	add		esp, 1 * 4	; removes arguments from stack
	add		esp, 1 * 4
	pop		ebp
	ret

section .data
_s0: db 'z', 0h
_s1: db ', ', 0h
_s2: db 'x', 0h
_s3: db 'y', 0h
_s4: db 'zz', 0h

section .bss
