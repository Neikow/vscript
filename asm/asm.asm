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
	push	ebp

	push	12
	; statement_debug (str)
	mov		eax, _s0
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp - 2 * 4]	; (z)
	call	iprintLF

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
	mov		eax, [ebp - 4 * 4]	; (z)
	call	iprintLF

	mov		ebx, 0	; exit code
	call	_exit

; debug_xy(x: int): void
fn_debug_xy2:
	push	ebp
	mov		ebp, esp	; saves the function base pointer

	; statement_debug (str)
	mov		eax, _s0
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp + 3 * 4]	; (z)
	call	iprintLF

	; statement_debug (str)
	mov		eax, _s2
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp + 1 * 4]	; (y)
	call	iprintLF

	add		esp, 0 * 4
	pop		ebp
	ret

; debug_x(x: int): void
fn_debug_x1:
	push	ebp
	mov		ebp, esp	; saves the function base pointer

	; statement_debug (str)
	mov		eax, _s0
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp + 1 * 4]	; (z)
	call	iprintLF

	push	10
	; statement_debug (str)
	mov		eax, _s2
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp - 2 * 4]	; (y)
	call	iprintLF

	; statement_debug (str)
	mov		eax, _s0
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp + 2 * 4]	; (z)
	call	iprintLF

	; statement_debug (str)
	mov		eax, _s0
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp + 2 * 4]	; (z)
	call	iprintLF

	; statement_debug (str)
	mov		eax, _s2
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp - 2 * 4]	; (y)
	call	iprintLF

	mov		eax, [ebp + 2 * 4]	; (x)
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
_s2: db 'y', 0h

section .bss
