; ZAX lowered .asm trace
; range: $0000..$0031 (end exclusive)

; func main begin
main:
0000: CA 00 00     jp cc, __zax_if_else_1
0003: 00           nop
0004: C3 00 00     jp __zax_if_end_2
__zax_if_else_1:
0007: 00           nop
__zax_if_end_2:
__zax_while_cond_3:
0008: CA 00 00     jp cc, __zax_while_end_4
000B: 00           nop
000C: C3 00 00     jp __zax_while_cond_3
__zax_repeat_body_5:
__zax_while_end_4:
000F: 00           nop
0010: C2 00 00     jp cc, __zax_repeat_body_5
0013: C3 00 00     jp __zax_select_dispatch_6
__zax_case_8:
0016: 00           nop
0017: C3 00 00     jp __zax_select_end_7
__zax_select_else_9:
001A: 00           nop
001B: C3 00 00     jp __zax_select_end_7
__zax_select_dispatch_6:
001E: E5           push HL
001F: 26 00        ld H, $0000
0021: 6F           ld L, A
0022: 7D           ld a, l
0023: FE 00        cp imm8
0025: C2 00 00     jp cc, __zax_select_next_10
0028: E1           pop HL
0029: C3 00 00     jp __zax_case_8
__zax_select_next_10:
002C: E1           pop HL
002D: C3 00 00     jp __zax_select_else_9
__zax_select_end_7:
0030: C9           ret
; func main end

; symbols:
; label main = $0000
; label __zax_if_else_1 = $0007
; label __zax_if_end_2 = $0008
; label __zax_while_cond_3 = $0008
; label __zax_repeat_body_5 = $000F
; label __zax_while_end_4 = $000F
; label __zax_case_8 = $0016
; label __zax_select_else_9 = $001A
; label __zax_select_dispatch_6 = $001E
; label __zax_select_next_10 = $002C
; label __zax_select_end_7 = $0030
