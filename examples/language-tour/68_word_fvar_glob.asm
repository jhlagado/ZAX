; ZAX lowered .asm trace
; range: $0100..$2012 (end exclusive)

; func word_fvar_glob begin
word_fvar_glob:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push DE                        ; 010B: D5
ld E, (IX + $0004)             ; 010C: DD 5E 04
ld D, (IX + $0005)             ; 010F: DD 56 05
ld hl, (glob_idx_word)         ; 0112: 2A 00 00
add HL, HL                     ; 0115: 29
add HL, DE                     ; 0116: 19
ld E, (HL)                     ; 0117: 5E
inc HL                         ; 0118: 23
ld D, (HL)                     ; 0119: 56
ld L, E                        ; 011A: 6B
ld H, D                        ; 011B: 62
pop DE                         ; 011C: D1
push DE                        ; 011D: D5
push HL                        ; 011E: E5
ld E, (IX + $0004)             ; 011F: DD 5E 04
ld D, (IX + $0005)             ; 0122: DD 56 05
ld hl, (glob_idx_word)         ; 0125: 2A 00 00
add HL, HL                     ; 0128: 29
add HL, DE                     ; 0129: 19
pop DE                         ; 012A: D1
ld (HL), E                     ; 012B: 73
inc HL                         ; 012C: 23
ld (HL), D                     ; 012D: 72
pop DE                         ; 012E: D1
__zax_epilogue_0:
pop DE                         ; 012F: D1
pop BC                         ; 0130: C1
pop AF                         ; 0131: F1
ld SP, IX                      ; 0132: DD F9
pop IX                         ; 0134: DD E1
ret                            ; 0136: C9
; func main begin
; func word_fvar_glob end
main:
push IX                        ; 0137: DD E5
ld IX, $0000                   ; 0139: DD 21 00 00
add IX, SP                     ; 013D: DD 39
push AF                        ; 013F: F5
push BC                        ; 0140: C5
push DE                        ; 0141: D5
push HL                        ; 0142: E5
ld HL, glob_words              ; 0143: 21 00 00
push HL                        ; 0146: E5
call word_fvar_glob            ; 0147: CD 00 00
inc SP                         ; 014A: 33
inc SP                         ; 014B: 33
__zax_epilogue_1:
pop HL                         ; 014C: E1
pop DE                         ; 014D: D1
pop BC                         ; 014E: C1
pop AF                         ; 014F: F1
ld SP, IX                      ; 0150: DD F9
pop IX                         ; 0152: DD E1
ret                            ; 0154: C9
; func main end

; symbols:
; label word_fvar_glob = $0100
; label __zax_epilogue_0 = $012F
; label main = $0137
; label __zax_epilogue_1 = $014C
; data glob_words = $2000
; data glob_idx_word = $2010
