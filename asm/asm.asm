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
	push	10
	; statement_debug (int)
	; x var
	mov		eax, [ebp - 2 * 4]
	; mov		eax, eax
	call	iprintLF

	; statement_debug (int)
	; y var
	mov		eax, [ebp - 3 * 4]
	; mov		eax, eax
	call	iprintLF

	; statement_debug (int)
	; x var
	mov		eax, [ebp - 2 * 4]
	push	eax	; arg 0
	; op call
	call	fn_incr1
	add		esp, 1 * 4	; removes arguments from stack
	; mov		eax, eax
	call	iprintLF

	mov		ebx, 0	; exit code
	call	_exit

; incr(z: int): int
fn_incr1:
	push	ebp
	mov		ebp, esp	; saves the function base pointer

	; statement_debug (int)
	; z arg
	mov		eax, [ebp + 2 * 4]
	; mov		eax, eax
	call	iprintLF
	mov		[ebp + 2 * 4], eax

	; op add
	; z arg
	mov		eax, [ebp + 2 * 4]
	mov		ebx, eax
	mov		eax, 1
	add		eax, ebx
	pop		ebp
	ret

section .data

section .bss
