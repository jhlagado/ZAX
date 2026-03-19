; ZAX lowered .asm trace
; range: $0100..$2071 (end exclusive)

; func word_fvar_const begin
word_fvar_const:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push DE                        ; 010B: D5
push HL                        ; 010C: E5
ld E, (IX + $0004)             ; 010D: DD 5E 04
ld D, (IX + $0005)             ; 0110: DD 56 05
ex DE, HL                      ; 0113: EB
ld DE, $0004                   ; 0114: 11 04 00
add HL, DE                     ; 0117: 19
push HL                        ; 0118: E5
pop HL                         ; 0119: E1
ld E, (HL)                     ; 011A: 5E
inc HL                         ; 011B: 23
ld D, (HL)                     ; 011C: 56
ld E, E                        ; 011D: 5B
ld D, D                        ; 011E: 52
ld E, (IX + $0004)             ; 011F: DD 5E 04
ld D, (IX + $0005)             ; 0122: DD 56 05
ex DE, HL                      ; 0125: EB
ld DE, $0006                   ; 0126: 11 06 00
add HL, DE                     ; 0129: 19
push HL                        ; 012A: E5
pop HL                         ; 012B: E1
ld (HL), E                     ; 012C: 73
inc HL                         ; 012D: 23
ld (HL), D                     ; 012E: 72
pop HL                         ; 012F: E1
pop DE                         ; 0130: D1
ld E, (IX + $0004)             ; 0131: DD 5E 04
ld D, (IX + $0005)             ; 0134: DD 56 05
ex DE, HL                      ; 0137: EB
ld DE, $0006                   ; 0138: 11 06 00
add HL, DE                     ; 013B: 19
push HL                        ; 013C: E5
pop HL                         ; 013D: E1
push DE                        ; 013E: D5
ld E, (HL)                     ; 013F: 5E
inc HL                         ; 0140: 23
ld D, (HL)                     ; 0141: 56
ld L, E                        ; 0142: 6B
ld H, D                        ; 0143: 62
pop DE                         ; 0144: D1
__zax_epilogue_0:
pop DE                         ; 0145: D1
pop BC                         ; 0146: C1
pop AF                         ; 0147: F1
ld SP, IX                      ; 0148: DD F9
pop IX                         ; 014A: DD E1
ret                            ; 014C: C9
; func main begin
; func word_fvar_const end
main:
push IX                        ; 014D: DD E5
ld IX, $0000                   ; 014F: DD 21 00 00
add IX, SP                     ; 0153: DD 39
push AF                        ; 0155: F5
push BC                        ; 0156: C5
push DE                        ; 0157: D5
push HL                        ; 0158: E5
ld HL, glob_words              ; 0159: 21 00 00
push HL                        ; 015C: E5
call word_fvar_const           ; 015D: CD 00 00
inc SP                         ; 0160: 33
inc SP                         ; 0161: 33
__zax_epilogue_1:
pop HL                         ; 0162: E1
pop DE                         ; 0163: D1
pop BC                         ; 0164: C1
pop AF                         ; 0165: F1
ld SP, IX                      ; 0166: DD F9
pop IX                         ; 0168: DD E1
ret                            ; 016A: C9
; func main end

; symbols:
; label word_fvar_const = $0100
; label __zax_epilogue_0 = $0145
; label main = $014D
; label __zax_epilogue_1 = $0162
; data glob_words = $2000
; label __zax_startup = $2010
